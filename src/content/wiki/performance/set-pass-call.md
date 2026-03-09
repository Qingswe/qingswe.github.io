---
title: SetPassCall
description: 说明 Unity 渲染中 SetPassCall 的含义、影响来源与优化思路。
tags: [unity, performance, rendering]
updated: 2025-04-28
---
## 是什么
`SetPassCall` 可以理解为 CPU 告诉 GPU：“接下来用这个 Shader Pass 和这组渲染状态来画。” 每次切换 Shader Pass、材质状态或部分渲染配置时，Unity 都可能产生一次新的 SetPass。

【重点】它衡量的是“状态切换次数”，不是“物体数量”。因此它和 DrawCall 相关，但不是一回事。

## 与 DrawCall 的区别
- DrawCall 是一次实际绘制命令
- SetPassCall 是绘制前的状态绑定或切换

常见关系：
- 多个物体共享同一个材质与 Pass 时，可能出现“多个 DrawCall 但较少 SetPassCall”
- 一个物体如果 Shader 有多个 Pass、额外光照 Pass、阴影 Pass 或后处理链路，也可能让 SetPassCall 上升

可以粗略理解为：`SetPassCall` 更像“切状态的次数”，DrawCall 更像“真正下发绘制的次数”。

## 为什么它值得关注
SetPass 发生在 CPU 提交渲染命令阶段，数量过高时通常意味着：
- 材质和 Shader Pass 过多
- 批处理被打断
- 前向渲染下额外灯光带来更多 Pass
- 阴影、深度、后处理等渲染阶段切换频繁

在移动端或 CPU 已经偏紧的项目里，SetPassCall 高往往会拖慢主线程和渲染线程的提交效率。

## 主要影响来源
### 1. 材质实例过多
同一个 Shader 但不同材质球、不同贴图绑定、不同关键字组合，都会增加切换次数。

### 2. Shader Pass 过多
一个看起来“只是一个材质”的效果，背后可能有多个渲染 Pass，例如主光照、额外光照、阴影和深度相关 Pass。

### 3. 批处理失效
共享材质被打断、对象排序混乱、额外状态修改过多时，原本可以连续提交的对象会被拆开。

### 4. 后处理和屏幕后效
这些效果通常包含多个全屏 Pass，很容易把 SetPass 数量拉高。

## 常见优化手段
- 尽量共享材质，避免无意义的材质实例化
- 合并纹理到图集，减少材质种类
- 控制 Shader Pass 数量，清理历史遗留关键字和冗余变体
- 对适合的场景使用 静态合批、动态合批、GPU Instancing 或 `SRP Batcher`
- 把“只为少数对象存在”的特殊效果拆成更少的材质变体

【注意】`MaterialPropertyBlock` 能减少额外材质实例，但并不等于一定减少 SetPass；如果底层 Pass 或关键字不同，切换仍然存在。

## 如何定位
1. 先在 `Profiler` 的 `Rendering` 模块看 `SetPass Calls` 与 `Batches` 是否同时偏高。
2. 再用 `Frame Debugger` 按顺序看是哪一批对象和哪几个 Pass 在反复切换。
3. 如果 `SetPassCall` 不高但帧时间仍差，问题就可能在 overdraw、片元着色器、带宽或后处理本身，而不是状态切换。

【技巧】优化 `SetPassCall` 的核心思路不是“盲目追求越低越好”，而是减少那些没有带来画面价值的材质和 Pass 切换。
