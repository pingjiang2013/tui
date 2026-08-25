from __future__ import annotations

import base64
from contextlib import contextmanager
import json
import shutil
import sys
import unittest
import uuid
from pathlib import Path
from unittest import mock


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))


@contextmanager
def writable_test_directory():
    path = PROJECT_ROOT / f".test-{uuid.uuid4().hex}"
    path.mkdir()
    try:
        yield str(path)
    finally:
        shutil.rmtree(path, ignore_errors=True)

import secure_text as app  # noqa: E402


class SecureTextTests(unittest.TestCase):
    def make_questions(self) -> list[app.Question]:
        return [
            app.Question("第一道问题？", "答案一"),
            app.Question("第二道问题？", "答案二"),
        ]

    def test_main_without_arguments_enters_interactive_mode(self) -> None:
        with mock.patch.object(app, "interactive_open", return_value=0) as interactive:
            self.assertEqual(app.main([]), 0)
            interactive.assert_called_once_with()

    def test_interactive_open_retries_missing_path_and_accepts_quoted_path(self) -> None:
        with writable_test_directory() as temporary_directory:
            vault_path = Path(temporary_directory) / "vault.stxt"
            vault_path.touch()
            inputs = iter(["missing.stxt", f'"{vault_path}"'])
            messages: list[str] = []
            with mock.patch.object(app, "open_vault") as open_vault:
                result = app.interactive_open(
                    input_func=lambda _prompt: next(inputs),
                    output_func=messages.append,
                )
            self.assertEqual(result, 0)
            open_vault.assert_called_once()
            self.assertEqual(open_vault.call_args.args[0], vault_path)
            self.assertTrue(any("找不到文件" in message for message in messages))

    def test_interactive_open_retries_invalid_file_and_blank_exits(self) -> None:
        with writable_test_directory() as temporary_directory:
            vault_path = Path(temporary_directory) / "invalid.stxt"
            vault_path.write_text("not a vault", encoding="utf-8")
            inputs = iter([str(vault_path), ""])
            messages: list[str] = []
            with mock.patch.object(
                app,
                "open_vault",
                side_effect=app.FileFormatError("测试格式错误"),
            ) as open_vault:
                result = app.interactive_open(
                    input_func=lambda _prompt: next(inputs),
                    output_func=messages.append,
                )
            self.assertEqual(result, 0)
            open_vault.assert_called_once()
            self.assertIn("文件格式错误", messages[0])
            self.assertIn("已退出交互模式", messages[-1])

    def test_round_trip_supports_unicode_and_empty_text(self) -> None:
        questions = self.make_questions()
        for plaintext in ("", "你好，世界！\n第二行\n"):
            envelope = app._build_envelope(plaintext, questions)
            answers = iter(["答案一", "答案二"])
            self.assertEqual(
                app.unlock_envelope(
                    envelope,
                    answer_func=lambda _prompt: next(answers),
                    output_func=lambda *_args, **_kwargs: None,
                ),
                plaintext,
            )

    def test_wrong_answer_retries_current_question(self) -> None:
        envelope = app._build_envelope("秘密内容", self.make_questions())
        answers = iter(["错误", "答案一", "答案二"])
        messages: list[str] = []
        plaintext = app.unlock_envelope(
            envelope,
            answer_func=lambda _prompt: next(answers),
            output_func=messages.append,
        )
        self.assertEqual(plaintext, "秘密内容")
        self.assertEqual(messages, ["答案不正确，请重试。"])

    def test_answers_are_exactly_matched(self) -> None:
        envelope = app._build_envelope("秘密", [app.Question("问题", "Case")])
        answers = iter([" case", "Case"])
        messages: list[str] = []
        self.assertEqual(
            app.unlock_envelope(
                envelope,
                answer_func=lambda _prompt: next(answers),
                output_func=messages.append,
            ),
            "秘密",
        )
        self.assertEqual(messages, ["答案不正确，请重试。"])

    def test_tampered_content_is_rejected(self) -> None:
        envelope = app._build_envelope("不可篡改", self.make_questions())
        encoded = envelope["content"]["ciphertext_b64"]
        content = bytearray(base64.b64decode(encoded))
        content[0] ^= 1
        envelope["content"]["ciphertext_b64"] = base64.b64encode(content).decode("ascii")
        answers = iter(["答案一", "答案二"])
        with self.assertRaises(app.FileFormatError):
            app.unlock_envelope(
                envelope,
                answer_func=lambda _prompt: next(answers),
                output_func=lambda *_args, **_kwargs: None,
            )

    def test_tampered_question_is_rejected_by_wrapper_authentication(self) -> None:
        envelope = app._build_envelope("内容", [app.Question("原问题", "答案")])
        envelope["questions"][0]["question"] = "被修改的问题"
        answers = iter(["答案"] * 2)
        with self.assertRaises(StopIteration):
            # The original answer can no longer authenticate the changed
            # prompt, so the configured infinite retry behavior continues.
            app.unlock_envelope(
                envelope,
                answer_func=lambda _prompt: next(answers),
                output_func=lambda *_args, **_kwargs: None,
            )

    def test_save_and_load_round_trip(self) -> None:
        with writable_test_directory() as temporary_directory:
            path = Path(temporary_directory) / "vault.stxt"
            envelope = app._build_envelope("保存测试", self.make_questions())
            app.save_envelope(path, envelope)
            loaded = app.load_envelope(path)
            answers = iter(["答案一", "答案二"])
            self.assertEqual(
                app.unlock_envelope(
                    loaded,
                    answer_func=lambda _prompt: next(answers),
                    output_func=lambda *_args, **_kwargs: None,
                ),
                "保存测试",
            )

    def test_encrypted_file_does_not_contain_plaintext_or_answers(self) -> None:
        with writable_test_directory() as temporary_directory:
            path = Path(temporary_directory) / "vault.stxt"
            app.save_envelope(
                path,
                app._build_envelope("需要隐藏的正文", self.make_questions()),
            )
            raw_file = path.read_text(encoding="utf-8")
            self.assertNotIn("需要隐藏的正文", raw_file)
            self.assertNotIn("答案一", raw_file)
            self.assertNotIn("答案二", raw_file)

    def test_open_reencrypts_edited_text_and_keeps_questions(self) -> None:
        with writable_test_directory() as temporary_directory:
            path = Path(temporary_directory) / "vault.stxt"
            app.save_envelope(
                path,
                app._build_envelope("原始正文", self.make_questions()),
            )
            answers = iter(["答案一", "答案二"])
            with mock.patch.object(app, "edit_text", return_value="更新后的正文"):
                app.open_vault(
                    path,
                    answer_func=lambda _prompt: next(answers),
                    input_func=lambda _prompt: "",
                    output_func=lambda *_args, **_kwargs: None,
                )
            updated = app.load_envelope(path)
            updated_answers = iter(["答案一", "答案二"])
            self.assertEqual(
                app.unlock_envelope(
                    updated,
                    answer_func=lambda _prompt: next(updated_answers),
                    output_func=lambda *_args, **_kwargs: None,
                ),
                "更新后的正文",
            )

    def test_invalid_questions_configuration_is_rejected(self) -> None:
        with writable_test_directory() as temporary_directory:
            path = Path(temporary_directory) / "questions.json"
            path.write_text(json.dumps({"questions": []}), encoding="utf-8")
            with self.assertRaises(app.VaultError):
                app.load_questions_file(path)

    def test_edit_text_cleans_up_temp_file(self) -> None:
        seen_paths: list[Path] = []

        def fake_editor(path: Path, _command: str | None) -> None:
            seen_paths.append(path)
            path.write_text("修改后的正文", encoding="utf-8")

        self.assertEqual(app.edit_text("初始正文", editor_runner=fake_editor), "修改后的正文")
        self.assertEqual(len(seen_paths), 1)
        self.assertFalse(seen_paths[0].exists())
        self.assertFalse(seen_paths[0].parent.exists())

    def test_create_does_not_overwrite_without_force(self) -> None:
        with writable_test_directory() as temporary_directory:
            path = Path(temporary_directory) / "vault.stxt"
            path.write_text("original", encoding="utf-8")
            with self.assertRaises(app.VaultError):
                app.create_vault(
                    path,
                    questions_file=None,
                    input_func=lambda _prompt: "1",
                    answer_func=mock.Mock(side_effect=["答案", "答案"]),
                    output_func=lambda *_args, **_kwargs: None,
                )
            self.assertEqual(path.read_text(encoding="utf-8"), "original")

    def test_change_questions_keeps_content_and_invalidates_old_answers(self) -> None:
        old_questions = [app.Question("旧问题", "旧答案")]
        new_questions = [app.Question("新问题", "新答案"), app.Question("第二题", "第二答案")]
        envelope = app._build_envelope("需要保留的内容", old_questions)
        plaintext = app.unlock_envelope(
            envelope,
            answer_func=lambda _prompt: "旧答案",
            output_func=lambda *_args, **_kwargs: None,
        )
        changed = app._build_envelope(plaintext, new_questions)
        new_answers = iter(["新答案", "第二答案"])
        self.assertEqual(
            app.unlock_envelope(
                changed,
                answer_func=lambda _prompt: next(new_answers),
                output_func=lambda *_args, **_kwargs: None,
            ),
            "需要保留的内容",
        )
        with self.assertRaises(StopIteration):
            old_answers = iter(["旧答案"] * 2)
            app.unlock_envelope(
                changed,
                answer_func=lambda _prompt: next(old_answers),
                output_func=lambda *_args, **_kwargs: None,
            )

    def test_change_questions_command_rewrites_existing_file(self) -> None:
        with writable_test_directory() as temporary_directory:
            root = Path(temporary_directory)
            vault_path = root / "vault.stxt"
            config_path = root / "new-questions.json"
            app.save_envelope(
                vault_path,
                app._build_envelope("命令测试内容", [app.Question("旧问题", "旧答案")]),
            )
            config_path.write_text(
                json.dumps(
                    {
                        "questions": [
                            {"question": "新问题", "answer": "新答案"},
                            {"question": "第二个新问题", "answer": "第二个答案"},
                        ]
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )
            app.change_questions(
                vault_path,
                questions_file=config_path,
                answer_func=lambda _prompt: "旧答案",
                output_func=lambda *_args, **_kwargs: None,
            )
            changed = app.load_envelope(vault_path)
            new_answers = iter(["新答案", "第二个答案"])
            self.assertEqual(
                app.unlock_envelope(
                    changed,
                    answer_func=lambda _prompt: next(new_answers),
                    output_func=lambda *_args, **_kwargs: None,
                ),
                "命令测试内容",
            )


if __name__ == "__main__":
    unittest.main()
