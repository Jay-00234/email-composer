# Email Composer

一个跑在 Claude Artifact 里的邮件起草小工具。贴入原邮件 + 用中文写清意图，一键生成英文/中文邮件，支持多轮修改和版本回滚。

## 它能做什么

- 四种场景：回复邮件、写新邮件、跟进催促、委婉拒绝
- 收件人预设：教授、HR、客户、同事、客服、房东等
- 语气可选：正式、职业、友好、随意、坚定礼貌，或自定义
- 中英文输出，结构是简短的 3 到 5 段
- 生成后可以用自然语言提修改意见，自动迭代
- 完整的版本历史，随时预览和回滚到任意一版
- 一键复制纯邮件正文（自动去掉中文说明部分）

## 怎么用

这个文件是一个 React 组件，**只能在 Claude Artifact 沙盒里运行**，因为它依赖 Artifact 环境提供的 Anthropic API 通道（不需要自己配 API key）。

### 推荐用法：让 Claude 帮你创建 Artifact

打开 Claude，发送如下指令：

```
帮我创建一个 React Artifact，代码如下：

[把 EmailComposer.jsx 的全部内容粘贴在这里]
```

Claude 会把代码渲染成可交互的 Artifact，然后就可以直接用了。

### 不推荐的用法

直接复制代码到自己的 React 项目里 `npm install` 跑会失败。

## 风格说明

System prompt 里设定了一套邮件风格规则：

- 简短直接，每段 1 到 3 句
- 避免 `I hope this email finds you well` 这种套话
- 倾向常用词而不是花哨的同义词
- 主题行控制在 10 个词以内
- 自动模式下根据收件人调整语气（教授偏正式，同学偏随意，HR 专业不卑微，等等）

不喜欢可以直接改 system prompt，这部分在 `handleGenerate` 和 `handleRevise` 两个函数里。

## 文件结构

```
EmailComposer.jsx    # 全部代码在这一个文件里
README.md            # 你正在读的这个
```

## License

MIT。随意改、随意用。
