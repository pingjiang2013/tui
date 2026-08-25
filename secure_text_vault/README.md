# Secure Text Vault

一个通过恢复问题解锁、查看和编辑 UTF-8 文本的命令行 Python 应用。

## 安装

需要 Python 3.10 或更高版本。

```powershell
python -m pip install -r requirements.txt
```

程序使用 `cryptography` 提供的 Scrypt 和 AES-256-GCM。恢复问题答案不会写入加密文件；问题文字、KDF 参数和加密元数据会保存在 UTF-8 JSON 容器中。

## 构建 Windows EXE

在 Windows AMD64 环境中生成单文件控制台程序：

    python -m pip install -r requirements-build.txt
    .\build_exe.ps1

构建完成后，dist 目录包含 secure_text.exe、本 README 和示例问题配置。运行 EXE 不需要另外安装 Python；由于它是命令行程序，运行时会保留控制台窗口。构建脚本不会复制本地的 .stxt 文件或其他敏感文件。

## 直接启动交互模式

不提供子命令时，程序会询问要打开的加密文件路径：

```powershell
python secure_text.py
```

输入 .stxt 文件路径后会执行解锁、查看和编辑流程。路径不存在、不是文件或文件格式错误时会重新询问；直接输入空行退出。也支持粘贴带引号的 Windows 路径。成功处理一个文件后程序退出。

## 创建加密文件

### 交互式设置问题和正文

```powershell
python secure_text.py create private.stxt
```

程序会询问恢复问题数量、问题内容和答案，然后打开编辑器输入初始正文。Windows 默认打开记事本；也可以通过 `--editor` 指定编辑器。

### 从明文文件导入

```powershell
python secure_text.py create private.stxt --from-plaintext notes.txt
```

明文源文件必须是 UTF-8。已有目标文件默认不会被覆盖；确认要覆盖时添加 `--force`。

### 从 JSON 导入问题

```powershell
python secure_text.py create private.stxt --questions-file questions.json
```

配置格式见 `questions.example.json`。配置文件包含明文答案，创建完成后应立即删除或限制访问权限。

## 打开、查看和编辑

```powershell
python secure_text.py open private.stxt
```

每道题都必须回答正确。答案完全精确匹配，不会自动去除首尾空格或忽略大小写；答错后当前问题会继续重试。全部验证通过后，正文会显示在命令行中，随后可进入编辑器修改。编辑器成功退出且正文有变化时，程序会在同一目录写入临时密文并原子替换原文件。

可通过命令行参数或环境变量指定编辑器：

```powershell
python secure_text.py open private.stxt --editor "code --wait"
$env:VISUAL = "notepad.exe"
```

编辑器退出失败、临时正文不是 UTF-8 或保存失败时，原加密文件不会被替换。

## 更换恢复问题

先使用旧问题解锁，再交互式设置新的问题和答案：

```powershell
python secure_text.py change-questions private.stxt
```

也可以导入新的 JSON 配置：

```powershell
python secure_text.py change-questions private.stxt --questions-file new-questions.json
```

## 安全注意事项

- 恢复问题答案通常熵较低，建议使用只有自己知道且足够长的答案。
- 问题文字会公开保存在加密文件中，这是打开文件时显示问题所必需的。
- 编辑时正文会短暂存在临时明文文件中，编辑器运行期间其他有权限的进程可能读取它；程序退出后会清理临时文件。
- 忘记全部答案后没有备用恢复方式。
- 本程序不联网，也不提供 GUI、主密码或自动备份。
