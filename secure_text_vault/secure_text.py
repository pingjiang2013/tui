"""Question-recovery encrypted text editor.

The application deliberately keeps the command-line interface and the file
format in this module so it can be copied and run directly with Python.
"""

from __future__ import annotations

import argparse
import base64
import getpass
import hmac
import json
import os
import shlex
import shutil
import subprocess
import sys
import tempfile
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Sequence

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt


FORMAT_NAME = "secure-text"
FORMAT_VERSION = 1
AES_ALGORITHM = "AES-256-GCM"
KDF_NAME = "scrypt"
KDF_N = 1 << 15
KDF_R = 8
KDF_P = 1
SALT_BYTES = 16
NONCE_BYTES = 12
KEY_BYTES = 32
GCM_TAG_BYTES = 16


class VaultError(Exception):
    """Expected application error that can be shown without a traceback."""


class FileFormatError(VaultError):
    """The input file is not a valid supported vault file."""


class EditorError(VaultError):
    """The configured editor could not be used successfully."""


@dataclass(frozen=True)
class Question:
    """A recovery question and its answer while held in memory."""

    question: str
    answer: str


InputFunc = Callable[[str], str]
OutputFunc = Callable[..., Any]
AnswerFunc = Callable[[str], str]


def _canonical_json(value: Any) -> bytes:
    """Serialize a JSON value deterministically for authenticated data."""

    try:
        return json.dumps(
            value,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
            allow_nan=False,
        ).encode("utf-8")
    except (TypeError, ValueError) as exc:
        raise FileFormatError("无法生成文件认证数据。") from exc


def _pretty_json(value: Any) -> bytes:
    try:
        return (
            json.dumps(
                value,
                ensure_ascii=False,
                indent=2,
                sort_keys=True,
                allow_nan=False,
            ).encode("utf-8")
            + b"\n"
        )
    except (TypeError, ValueError) as exc:
        raise VaultError("无法生成加密文件。") from exc


def _b64encode(value: bytes) -> str:
    return base64.b64encode(value).decode("ascii")


def _b64decode(value: Any, field_name: str) -> bytes:
    if not isinstance(value, str):
        raise FileFormatError(f"字段 {field_name} 必须是 Base64 字符串。")
    try:
        return base64.b64decode(value.encode("ascii"), validate=True)
    except (UnicodeEncodeError, ValueError, base64.binascii.Error) as exc:
        raise FileFormatError(f"字段 {field_name} 不是有效的 Base64。") from exc


def _read_utf8(path: Path) -> str:
    try:
        with path.open("r", encoding="utf-8", newline="") as handle:
            return handle.read()
    except FileNotFoundError as exc:
        raise VaultError(f"找不到文件：{path}") from exc
    except UnicodeDecodeError as exc:
        raise VaultError(f"文件不是有效的 UTF-8 文本：{path}") from exc
    except OSError as exc:
        raise VaultError(f"读取文件失败：{path}（{exc}）") from exc


def _write_utf8(path: Path, text: str) -> None:
    try:
        with path.open("w", encoding="utf-8", newline="") as handle:
            handle.write(text)
    except OSError as exc:
        raise EditorError(f"写入临时文本失败：{path}（{exc}）") from exc


def _validate_question(question: str, answer: str, index: int) -> Question:
    if not isinstance(question, str) or not question.strip():
        raise VaultError(f"第 {index} 个恢复问题不能为空。")
    if not isinstance(answer, str) or answer == "":
        raise VaultError(f"第 {index} 个恢复答案不能为空。")
    return Question(question=question.strip(), answer=answer)


def load_questions_file(path: Path) -> list[Question]:
    """Load the user-facing JSON question configuration."""

    try:
        raw = json.loads(_read_utf8(path))
    except json.JSONDecodeError as exc:
        raise VaultError(f"问题配置不是有效的 JSON：{path}（{exc.msg}）") from exc

    if not isinstance(raw, dict) or not isinstance(raw.get("questions"), list):
        raise VaultError("问题配置必须包含 questions 数组。")
    if not raw["questions"]:
        raise VaultError("至少需要一个恢复问题。")

    questions: list[Question] = []
    for index, item in enumerate(raw["questions"], start=1):
        if not isinstance(item, dict):
            raise VaultError(f"第 {index} 个问题配置必须是对象。")
        if "question" not in item or "answer" not in item:
            raise VaultError(f"第 {index} 个问题配置必须包含 question 和 answer。")
        questions.append(_validate_question(item["question"], item["answer"], index))
    return questions


def collect_questions(
    questions_file: Path | None = None,
    *,
    input_func: InputFunc = input,
    answer_func: AnswerFunc = getpass.getpass,
    output_func: OutputFunc = print,
) -> list[Question]:
    """Collect recovery questions interactively or from a JSON file."""

    if questions_file is not None:
        output_func("警告：问题配置文件包含明文答案，请在创建完成后妥善保护或删除它。")
        return load_questions_file(questions_file)

    while True:
        raw_count = input_func("请输入恢复问题数量：")
        try:
            count = int(raw_count)
        except ValueError:
            output_func("请输入正整数。")
            continue
        if count < 1:
            output_func("恢复问题数量必须至少为 1。")
            continue
        break

    questions: list[Question] = []
    for index in range(1, count + 1):
        while True:
            question_text = input_func(f"请输入第 {index} 个恢复问题：")
            answer = answer_func(f"请输入第 {index} 个恢复答案（不会显示）：")
            confirmation = answer_func(f"请再次输入第 {index} 个恢复答案：")
            if answer != confirmation:
                output_func("两次答案不一致，请重新设置这一题。")
                continue
            questions.append(_validate_question(question_text, answer, index))
            break
    return questions


def _derive_wrapping_key(answer: str, salt: bytes) -> bytes:
    try:
        return Scrypt(
            salt=salt,
            length=KEY_BYTES,
            n=KDF_N,
            r=KDF_R,
            p=KDF_P,
        ).derive(answer.encode("utf-8"))
    except (TypeError, ValueError) as exc:
        raise VaultError("无法从恢复答案生成密钥。") from exc


def _wrap_aad(index: int, question: str) -> bytes:
    return _canonical_json(
        {
            "format": FORMAT_NAME,
            "version": FORMAT_VERSION,
            "question_index": index,
            "question": question,
        }
    )


def _header_for_aad(envelope: dict[str, Any]) -> dict[str, Any]:
    content = envelope["content"]
    return {
        "format": envelope["format"],
        "version": envelope["version"],
        "questions": envelope["questions"],
        "content": {
            "algorithm": content["algorithm"],
            "nonce_b64": content["nonce_b64"],
        },
    }


def _build_envelope(plaintext: str, questions: Sequence[Question]) -> dict[str, Any]:
    if not questions:
        raise VaultError("至少需要一个恢复问题。")

    data_key = AESGCM.generate_key(bit_length=256)
    question_entries: list[dict[str, Any]] = []

    for index, item in enumerate(questions):
        validated = _validate_question(item.question, item.answer, index + 1)
        salt = os.urandom(SALT_BYTES)
        nonce = os.urandom(NONCE_BYTES)
        wrapping_key = _derive_wrapping_key(validated.answer, salt)
        wrapped_key = AESGCM(wrapping_key).encrypt(
            nonce,
            data_key,
            _wrap_aad(index, validated.question),
        )
        question_entries.append(
            {
                "question": validated.question,
                "kdf": {
                    "name": KDF_NAME,
                    "n": KDF_N,
                    "p": KDF_P,
                    "r": KDF_R,
                    "salt_b64": _b64encode(salt),
                },
                "wrapped_key": {
                    "algorithm": AES_ALGORITHM,
                    "ciphertext_b64": _b64encode(wrapped_key),
                    "nonce_b64": _b64encode(nonce),
                },
            }
        )

    content_nonce = os.urandom(NONCE_BYTES)
    envelope: dict[str, Any] = {
        "content": {
            "algorithm": AES_ALGORITHM,
            "ciphertext_b64": "",
            "nonce_b64": _b64encode(content_nonce),
        },
        "format": FORMAT_NAME,
        "questions": question_entries,
        "version": FORMAT_VERSION,
    }
    content_ciphertext = AESGCM(data_key).encrypt(
        content_nonce,
        plaintext.encode("utf-8"),
        _canonical_json(_header_for_aad(envelope)),
    )
    envelope["content"]["ciphertext_b64"] = _b64encode(content_ciphertext)
    return envelope


def _require_dict(value: Any, field_name: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise FileFormatError(f"字段 {field_name} 必须是对象。")
    return value


def _require_string(value: Any, field_name: str) -> str:
    if not isinstance(value, str):
        raise FileFormatError(f"字段 {field_name} 必须是字符串。")
    return value


def _require_int(value: Any, field_name: str) -> int:
    if type(value) is not int:
        raise FileFormatError(f"字段 {field_name} 必须是整数。")
    return value


def _validate_envelope(envelope: Any) -> dict[str, Any]:
    if not isinstance(envelope, dict):
        raise FileFormatError("加密文件顶层必须是 JSON 对象。")
    required = {"content", "format", "questions", "version"}
    if set(envelope) != required:
        raise FileFormatError("加密文件字段不完整或包含未知字段。")
    if envelope["format"] != FORMAT_NAME:
        raise FileFormatError("不是 secure-text 加密文件。")
    if envelope["version"] != FORMAT_VERSION:
        raise FileFormatError(f"不支持的加密文件版本：{envelope['version']!r}")
    if not isinstance(envelope["questions"], list) or not envelope["questions"]:
        raise FileFormatError("加密文件至少需要一个恢复问题。")

    for index, raw_question in enumerate(envelope["questions"]):
        question_entry = _require_dict(raw_question, f"questions[{index}]")
        if set(question_entry) != {"kdf", "question", "wrapped_key"}:
            raise FileFormatError(f"questions[{index}] 字段不正确。")
        question_text = _require_string(
            question_entry["question"], f"questions[{index}].question"
        )
        if not question_text.strip():
            raise FileFormatError(f"questions[{index}].question 不能为空。")

        kdf = _require_dict(question_entry["kdf"], f"questions[{index}].kdf")
        if set(kdf) != {"n", "p", "r", "name", "salt_b64"}:
            raise FileFormatError(f"questions[{index}].kdf 字段不正确。")
        if kdf["name"] != KDF_NAME:
            raise FileFormatError(f"questions[{index}] 使用了不支持的 KDF。")
        if (
            _require_int(kdf["n"], f"questions[{index}].kdf.n") != KDF_N
            or _require_int(kdf["r"], f"questions[{index}].kdf.r") != KDF_R
            or _require_int(kdf["p"], f"questions[{index}].kdf.p") != KDF_P
        ):
            raise FileFormatError(f"questions[{index}] 的 KDF 参数不受支持。")
        salt = _b64decode(kdf["salt_b64"], f"questions[{index}].kdf.salt_b64")
        if len(salt) != SALT_BYTES:
            raise FileFormatError(f"questions[{index}] 的 salt 长度不正确。")

        wrapped = _require_dict(
            question_entry["wrapped_key"], f"questions[{index}].wrapped_key"
        )
        if set(wrapped) != {"algorithm", "ciphertext_b64", "nonce_b64"}:
            raise FileFormatError(f"questions[{index}].wrapped_key 字段不正确。")
        if wrapped["algorithm"] != AES_ALGORITHM:
            raise FileFormatError(f"questions[{index}] 使用了不支持的加密算法。")
        nonce = _b64decode(
            wrapped["nonce_b64"], f"questions[{index}].wrapped_key.nonce_b64"
        )
        if len(nonce) != NONCE_BYTES:
            raise FileFormatError(f"questions[{index}] 的 wrapper nonce 长度不正确。")
        ciphertext = _b64decode(
            wrapped["ciphertext_b64"],
            f"questions[{index}].wrapped_key.ciphertext_b64",
        )
        if len(ciphertext) != KEY_BYTES + GCM_TAG_BYTES:
            raise FileFormatError(f"questions[{index}] 的 wrapped key 长度不正确。")

    content = _require_dict(envelope["content"], "content")
    if set(content) != {"algorithm", "ciphertext_b64", "nonce_b64"}:
        raise FileFormatError("content 字段不正确。")
    if content["algorithm"] != AES_ALGORITHM:
        raise FileFormatError("正文使用了不支持的加密算法。")
    content_nonce = _b64decode(content["nonce_b64"], "content.nonce_b64")
    if len(content_nonce) != NONCE_BYTES:
        raise FileFormatError("正文 nonce 长度不正确。")
    content_ciphertext = _b64decode(content["ciphertext_b64"], "content.ciphertext_b64")
    if len(content_ciphertext) < GCM_TAG_BYTES:
        raise FileFormatError("正文密文长度不正确。")
    return envelope


def load_envelope(path: Path) -> dict[str, Any]:
    try:
        raw_text = _read_utf8(path)
        parsed = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise FileFormatError(f"加密文件不是有效的 JSON：{path}（{exc.msg}）") from exc
    return _validate_envelope(parsed)


def _unwrap_key(question_entry: dict[str, Any], index: int, answer: str) -> bytes:
    kdf = question_entry["kdf"]
    salt = _b64decode(kdf["salt_b64"], f"questions[{index}].kdf.salt_b64")
    wrapping_key = _derive_wrapping_key(answer, salt)
    return _unwrap_key_with_wrapping_key(question_entry, index, wrapping_key)


def _unwrap_key_with_wrapping_key(
    question_entry: dict[str, Any], index: int, wrapping_key: bytes
) -> bytes:
    wrapped = question_entry["wrapped_key"]
    nonce = _b64decode(
        wrapped["nonce_b64"], f"questions[{index}].wrapped_key.nonce_b64"
    )
    ciphertext = _b64decode(
        wrapped["ciphertext_b64"], f"questions[{index}].wrapped_key.ciphertext_b64"
    )
    return AESGCM(wrapping_key).decrypt(
        nonce,
        ciphertext,
        _wrap_aad(index, question_entry["question"]),
    )


def unlock_envelope(
    envelope: dict[str, Any],
    *,
    answer_func: AnswerFunc = getpass.getpass,
    output_func: OutputFunc = print,
) -> str:
    """Ask every question until it is answered correctly, then decrypt text."""

    _validate_envelope(envelope)
    data_key: bytes | None = None
    for index, question_entry in enumerate(envelope["questions"]):
        while True:
            answer = answer_func(
                f"恢复问题 {index + 1}/{len(envelope['questions'])}："
                f"{question_entry['question']}\n答案（不会显示）："
            )
            try:
                candidate_key = _unwrap_key(question_entry, index, answer)
            except InvalidTag:
                output_func("答案不正确，请重试。")
                continue
            if len(candidate_key) != KEY_BYTES:
                raise FileFormatError("解出的正文密钥长度不正确。")
            if data_key is None:
                data_key = candidate_key
            elif not hmac.compare_digest(data_key, candidate_key):
                raise FileFormatError("不同恢复问题解出的密钥不一致，文件可能已被篡改。")
            break

    if data_key is None:
        raise FileFormatError("没有可用的正文密钥。")

    content = envelope["content"]
    try:
        plaintext = AESGCM(data_key).decrypt(
            _b64decode(content["nonce_b64"], "content.nonce_b64"),
            _b64decode(content["ciphertext_b64"], "content.ciphertext_b64"),
            _canonical_json(_header_for_aad(envelope)),
        )
        return plaintext.decode("utf-8")
    except InvalidTag as exc:
        raise FileFormatError("正文认证失败，文件可能已被篡改。") from exc
    except UnicodeDecodeError as exc:
        raise FileFormatError("解密后的正文不是有效的 UTF-8 文本。") from exc


def _parse_editor_command(command: str) -> list[str]:
    try:
        parts = shlex.split(command, posix=os.name != "nt")
    except ValueError as exc:
        raise EditorError(f"编辑器命令格式不正确：{exc}") from exc
    if os.name == "nt":
        parts = [part.strip('"') for part in parts]
    if not parts:
        raise EditorError("编辑器命令不能为空。")
    return parts


def _resolve_editor(command: str | None) -> list[str]:
    selected = command or os.environ.get("VISUAL") or os.environ.get("EDITOR")
    if selected:
        return _parse_editor_command(selected)
    return ["notepad.exe"] if os.name == "nt" else ["vi"]


def run_editor(path: Path, command: str | None = None) -> None:
    argv = _resolve_editor(command)
    try:
        completed = subprocess.run([*argv, str(path)], check=False)
    except OSError as exc:
        raise EditorError(f"无法启动编辑器 {' '.join(argv)}：{exc}") from exc
    if completed.returncode != 0:
        raise EditorError(f"编辑器退出失败，退出码为 {completed.returncode}。")


def _create_writable_temp_directory(prefix: str) -> Path:
    base_directory = Path(tempfile.gettempdir())
    for _ in range(100):
        candidate = base_directory / f"{prefix}{uuid.uuid4().hex}"
        try:
            # Path.mkdir uses the platform's normal inherited permissions.
            # This avoids Windows sandbox implementations that interpret the
            # tempfile module's 0o700 directory mode as read-only.
            candidate.mkdir()
            return candidate
        except FileExistsError:
            continue
        except OSError as exc:
            raise EditorError(f"无法创建临时目录：{base_directory}（{exc}）") from exc
    raise EditorError("无法创建唯一的临时目录。")


def edit_text(
    initial_text: str,
    editor_command: str | None = None,
    *,
    editor_runner: Callable[[Path, str | None], None] = run_editor,
) -> str:
    """Edit text in a temporary UTF-8 file and remove it afterwards."""

    temporary_directory = _create_writable_temp_directory("secure-text-")
    try:
        temporary_path = temporary_directory / "document.txt"
        _write_utf8(temporary_path, initial_text)
        editor_runner(temporary_path, editor_command)
        return _read_utf8(temporary_path)
    except EditorError:
        raise
    except VaultError:
        raise
    except OSError as exc:
        raise EditorError(f"编辑临时文件失败：{exc}") from exc
    finally:
        shutil.rmtree(temporary_directory, ignore_errors=True)


def _set_private_permissions(path: Path) -> None:
    if os.name == "nt":
        # On Windows, chmod(0o600) can remove the write bit instead of
        # expressing POSIX-style owner permissions.
        return
    try:
        os.chmod(path, 0o600)
    except OSError:
        # Windows ACLs do not map cleanly to chmod; the file is still created
        # in the user's selected directory and the operation remains safe.
        pass


def atomic_write(path: Path, data: bytes, *, replace_existing: bool = True) -> None:
    """Write bytes beside the destination and atomically replace it."""

    parent = path.parent
    if not parent.exists():
        raise VaultError(f"目标目录不存在：{parent}")
    if not parent.is_dir():
        raise VaultError(f"目标目录不是目录：{parent}")
    if path.exists() and not replace_existing:
        raise VaultError(f"目标文件已存在：{path}（如需覆盖请使用 --force）")

    temporary_name: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb",
            prefix=f".{path.name}.",
            suffix=".tmp",
            dir=parent,
            delete=False,
        ) as temporary_file:
            temporary_name = temporary_file.name
            _set_private_permissions(Path(temporary_name))
            temporary_file.write(data)
            temporary_file.flush()
            os.fsync(temporary_file.fileno())
        os.replace(temporary_name, path)
        temporary_name = None
        _set_private_permissions(path)
    except OSError as exc:
        raise VaultError(f"保存加密文件失败：{path}（{exc}）") from exc
    finally:
        if temporary_name is not None:
            try:
                Path(temporary_name).unlink(missing_ok=True)
            except OSError:
                pass


def save_envelope(path: Path, envelope: dict[str, Any], *, force: bool = True) -> None:
    atomic_write(path, _pretty_json(envelope), replace_existing=force)


def print_plaintext(text: str, *, output_func: OutputFunc = print) -> None:
    output_func("----- 解密内容开始 -----")
    output_func(text, end="" if text.endswith("\n") else "\n")
    output_func("----- 解密内容结束 -----")


def create_vault(
    output_path: Path,
    *,
    plaintext_path: Path | None = None,
    questions_file: Path | None = None,
    editor_command: str | None = None,
    force: bool = False,
    input_func: InputFunc = input,
    answer_func: AnswerFunc = getpass.getpass,
    output_func: OutputFunc = print,
) -> None:
    if output_path.exists() and not force:
        raise VaultError(f"目标文件已存在：{output_path}（如需覆盖请使用 --force）")

    questions = collect_questions(
        questions_file,
        input_func=input_func,
        answer_func=answer_func,
        output_func=output_func,
    )
    if plaintext_path is None:
        output_func("正在打开编辑器，请输入初始正文并保存后退出编辑器。")
        plaintext = edit_text("", editor_command)
    else:
        plaintext = _read_utf8(plaintext_path)

    save_envelope(output_path, _build_envelope(plaintext, questions), force=force)
    output_func(f"加密文件已创建：{output_path}")


def open_vault(
    vault_path: Path,
    *,
    editor_command: str | None = None,
    answer_func: AnswerFunc = getpass.getpass,
    input_func: InputFunc = input,
    output_func: OutputFunc = print,
) -> None:
    envelope = load_envelope(vault_path)
    plaintext, _data_key, wrapping_keys = unlock_envelope_with_keys(
        envelope,
        answer_func=answer_func,
        output_func=output_func,
    )
    print_plaintext(plaintext, output_func=output_func)
    choice = input_func("是否进入编辑并保存？[Y/n]：").strip().lower()
    if choice in {"n", "no", "否"}:
        output_func("未修改加密文件。")
        return

    edited_text = edit_text(plaintext, editor_command)
    if edited_text == plaintext:
        output_func("内容未改变，未重写加密文件。")
        return
    save_envelope(
        vault_path,
        _reencrypt_with_existing_wrappers(edited_text, envelope, wrapping_keys),
    )
    output_func(f"已安全保存：{vault_path}")


def _clean_interactive_path(raw_path: str) -> str:
    cleaned = raw_path.strip()
    if len(cleaned) >= 2 and cleaned[0] == cleaned[-1] and cleaned[0] in {'"', "'"}:
        cleaned = cleaned[1:-1].strip()
    return cleaned


def interactive_open(
    *,
    input_func: InputFunc = input,
    answer_func: AnswerFunc = getpass.getpass,
    output_func: OutputFunc = print,
    editor_command: str | None = None,
) -> int:
    """Prompt for one vault path, retrying invalid paths or files."""

    while True:
        try:
            raw_path = input_func("请输入加密文本文件路径（直接回车退出）：")
        except EOFError:
            output_func("\n已退出交互模式。")
            return 0

        path_text = _clean_interactive_path(raw_path)
        if not path_text:
            output_func("已退出交互模式。")
            return 0

        vault_path = Path(path_text).expanduser()
        if not vault_path.exists():
            output_func(f"找不到文件：{vault_path}，请重新输入。")
            continue
        if not vault_path.is_file():
            output_func(f"路径不是文件：{vault_path}，请重新输入。")
            continue

        try:
            open_vault(
                vault_path,
                editor_command=editor_command,
                answer_func=answer_func,
                input_func=input_func,
                output_func=output_func,
            )
        except FileFormatError as exc:
            output_func(f"文件格式错误：{exc}，请重新输入。")
            continue
        except (EditorError, VaultError, OSError) as exc:
            output_func(f"错误：{exc}")
            return 1
        return 0


def unlock_envelope_with_keys(
    envelope: dict[str, Any],
    *,
    answer_func: AnswerFunc = getpass.getpass,
    output_func: OutputFunc = print,
) -> tuple[str, bytes, list[bytes]]:
    """Unlock while retaining derived wrapper keys for an edit save.

    The normal unlock function remains small and returns only plaintext. This
    variant is used by commands that must save with the same questions without
    asking the user to enter every answer a second time.
    """

    _validate_envelope(envelope)
    data_key: bytes | None = None
    wrapping_keys: list[bytes] = []
    for index, question_entry in enumerate(envelope["questions"]):
        while True:
            answer = answer_func(
                f"恢复问题 {index + 1}/{len(envelope['questions'])}："
                f"{question_entry['question']}\n答案（不会显示）："
            )
            salt = _b64decode(
                question_entry["kdf"]["salt_b64"],
                f"questions[{index}].kdf.salt_b64",
            )
            wrapping_key = _derive_wrapping_key(answer, salt)
            try:
                candidate_key = _unwrap_key_with_wrapping_key(
                    question_entry,
                    index,
                    wrapping_key,
                )
            except InvalidTag:
                output_func("答案不正确，请重试。")
                continue
            if len(candidate_key) != KEY_BYTES:
                raise FileFormatError("解出的正文密钥长度不正确。")
            if data_key is None:
                data_key = candidate_key
            elif not hmac.compare_digest(data_key, candidate_key):
                raise FileFormatError("不同恢复问题解出的密钥不一致，文件可能已被篡改。")
            wrapping_keys.append(wrapping_key)
            break

    if data_key is None:
        raise FileFormatError("没有可用的正文密钥。")
    try:
        content = envelope["content"]
        plaintext = AESGCM(data_key).decrypt(
            _b64decode(content["nonce_b64"], "content.nonce_b64"),
            _b64decode(content["ciphertext_b64"], "content.ciphertext_b64"),
            _canonical_json(_header_for_aad(envelope)),
        ).decode("utf-8")
    except InvalidTag as exc:
        raise FileFormatError("正文认证失败，文件可能已被篡改。") from exc
    except UnicodeDecodeError as exc:
        raise FileFormatError("解密后的正文不是有效的 UTF-8 文本。") from exc
    return plaintext, data_key, wrapping_keys


def _reencrypt_with_existing_wrappers(
    plaintext: str,
    old_envelope: dict[str, Any],
    wrapping_keys: Sequence[bytes],
) -> dict[str, Any]:
    """Rotate the content key while retaining the configured answers."""

    if len(wrapping_keys) != len(old_envelope["questions"]):
        raise FileFormatError("恢复问题密钥数量不一致。")
    data_key = AESGCM.generate_key(bit_length=256)
    question_entries: list[dict[str, Any]] = []
    for index, (old_entry, wrapping_key) in enumerate(
        zip(old_envelope["questions"], wrapping_keys)
    ):
        nonce = os.urandom(NONCE_BYTES)
        wrapped = AESGCM(wrapping_key).encrypt(
            nonce,
            data_key,
            _wrap_aad(index, old_entry["question"]),
        )
        question_entries.append(
            {
                "question": old_entry["question"],
                "kdf": old_entry["kdf"],
                "wrapped_key": {
                    "algorithm": AES_ALGORITHM,
                    "ciphertext_b64": _b64encode(wrapped),
                    "nonce_b64": _b64encode(nonce),
                },
            }
        )

    content_nonce = os.urandom(NONCE_BYTES)
    envelope: dict[str, Any] = {
        "content": {
            "algorithm": AES_ALGORITHM,
            "ciphertext_b64": "",
            "nonce_b64": _b64encode(content_nonce),
        },
        "format": FORMAT_NAME,
        "questions": question_entries,
        "version": FORMAT_VERSION,
    }
    envelope["content"]["ciphertext_b64"] = _b64encode(
        AESGCM(data_key).encrypt(
            content_nonce,
            plaintext.encode("utf-8"),
            _canonical_json(_header_for_aad(envelope)),
        )
    )
    return envelope


def change_questions(
    vault_path: Path,
    *,
    questions_file: Path | None = None,
    input_func: InputFunc = input,
    answer_func: AnswerFunc = getpass.getpass,
    output_func: OutputFunc = print,
) -> None:
    envelope = load_envelope(vault_path)
    plaintext, _data_key, _wrapping_keys = unlock_envelope_with_keys(
        envelope,
        answer_func=answer_func,
        output_func=output_func,
    )
    output_func("旧恢复问题验证成功。现在设置新的恢复问题。")
    questions = collect_questions(
        questions_file,
        input_func=input_func,
        answer_func=answer_func,
        output_func=output_func,
    )
    save_envelope(vault_path, _build_envelope(plaintext, questions))
    output_func(f"恢复问题已更新：{vault_path}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="使用恢复问题保护并编辑 UTF-8 文本。",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    create_parser = subparsers.add_parser("create", help="创建加密文本文件")
    create_parser.add_argument("output", type=Path, help="加密文件路径")
    create_parser.add_argument(
        "--from-plaintext",
        type=Path,
        help="从现有 UTF-8 明文文件导入；不指定时打开空白编辑器",
    )
    create_parser.add_argument(
        "--questions-file",
        type=Path,
        help="包含 questions 数组的问题配置 JSON",
    )
    create_parser.add_argument("--editor", help="编辑器命令，优先级高于 VISUAL/EDITOR")
    create_parser.add_argument(
        "--force",
        action="store_true",
        help="允许覆盖已有加密文件",
    )

    open_parser = subparsers.add_parser("open", help="解锁、查看并编辑加密文本文件")
    open_parser.add_argument("file", type=Path, help="加密文件路径")
    open_parser.add_argument("--editor", help="编辑器命令，优先级高于 VISUAL/EDITOR")

    change_parser = subparsers.add_parser(
        "change-questions",
        help="解锁后更换恢复问题和答案",
    )
    change_parser.add_argument("file", type=Path, help="加密文件路径")
    change_parser.add_argument(
        "--questions-file",
        type=Path,
        help="包含新 questions 数组的问题配置 JSON",
    )
    return parser


def _configure_stdio() -> None:
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is not None:
            try:
                reconfigure(encoding="utf-8", errors="replace")
            except OSError:
                pass


def main(argv: Sequence[str] | None = None) -> int:
    _configure_stdio()
    command_args = list(sys.argv[1:] if argv is None else argv)
    if not command_args:
        return interactive_open()

    parser = build_parser()
    args = parser.parse_args(command_args)
    try:
        if args.command == "create":
            create_vault(
                args.output,
                plaintext_path=args.from_plaintext,
                questions_file=args.questions_file,
                editor_command=args.editor,
                force=args.force,
            )
        elif args.command == "open":
            open_vault(args.file, editor_command=args.editor)
        elif args.command == "change-questions":
            change_questions(args.file, questions_file=args.questions_file)
        else:  # pragma: no cover - argparse prevents this branch.
            parser.error("未知命令")
    except KeyboardInterrupt:
        print("\n操作已取消。", file=sys.stderr)
        return 130
    except (VaultError, OSError) as exc:
        print(f"错误：{exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
