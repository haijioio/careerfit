# CareerFit V6

AI 驱动的长期职业资产与 JD 简历重构 PWA。

## 本版重点修复
- 简历生成不再生成新的简历样式；两版简历均使用用户提供的 `resume(2).html` 原始模板。
- AI 只负责生成结构化简历内容，Template Adapter 负责把内容注入原模板已有 DOM 区域。
- “为什么这样修改”独立显示在 CareerFit 页面中，并强制使用中文；不会进入简历正文或 PDF。
- 支持从生成结果下载真正的 HTML 简历，或打开原模板并打印 / 导出 PDF。
- 修复原模板打印容易产生空白第二页的问题。
- JD 支持直接向同一个 JD 文本框粘贴多张截图（⌘V / Ctrl+V），也保留文件上传方式。
- AI 失败时保留已经成功生成的版本，不覆盖成功结果。

## 隐私
职业资料、证据、JD 与生成历史默认保存在当前浏览器。调用 AI 时，只有主动提交给当前 AI 的内容会发送到对应服务商。


R14 changes: preserve template sections when AI output is empty; confirmed education fallback; preserve original personal header if profile fields are blank; fallback to source work history when AI company names do not match; experience ordering remains newest-first.


## R17：职业资料导入与校园经历
- Markdown/TXT 支持文件选择和直接粘贴，先解析预览，再由用户确认合并。
- 预览阶段显示重复项和疑似同标题冲突；重复内容会跳过，冲突需显式勾选确认后作为独立候选项导入。
- 导入的职业证据默认 `confirmed: false`，JD 匹配只接收已确认证据。
- 新增独立 `campusExperiences` 字段，避免校园经历混入正式工作经历；只有已确认校园经历会进入 JD 分析上下文。
- 完整 JSON 导入会二次确认，并在本机保留导入前职业资料备份。
- 数据仍保存在当前浏览器；清除浏览器数据或换浏览器前请先导出 JSON。
