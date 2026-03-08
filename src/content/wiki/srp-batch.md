---
title: SRP Batch
description: URP/HDRP 中的渲染合批优化技术，通过减少 CPU 向 GPU 提交 DrawCall 的开销来提升渲染性能
tags: [图形学, Shader, Unity, URP, 性能优化]
updated: 2024-07-06
---

## 什么是 SRP Batch？

SRP Batch（Scriptable Render Pipeline Batching）是 Unity URP / HDRP 中的一种**渲染合批优化技术**。它的核心目标是减少 CPU 向 GPU 提交渲染命令（DrawCall）时的开销。

传统渲染中，每次 DrawCall 前 CPU 都需要设置大量渲染状态。SRP Batch 通过在 GPU 上维护一个持久的**材质属性缓冲（CBUFFER）**，让 CPU 只需更新变化的数据，而不用每帧重新提交全部状态。

## 工作原理

SRP Batch 要求 Shader 将材质属性声明在 `CBUFFER_START(UnityPerMaterial)` 块中：

```hlsl
CBUFFER_START(UnityPerMaterial)
    float4 _MainTex_ST;
    half4  _BaseColor;
    float  _Glossiness;
CBUFFER_END
```

这样 Unity 可以将同一 Shader 的多个材质实例的属性数据**批量上传到 GPU**，渲染时只切换偏移量而不重新上传数据，大幅减少 CPU 开销。

## 兼容性要求

Shader 需满足以下条件才能参与 SRP Batch：

1. 所有材质属性必须放在 `UnityPerMaterial` CBUFFER 中
2. 所有内置引擎属性（Transform 等）必须放在 `UnityPerDraw` CBUFFER 中（URP ShaderLibrary 已自动处理）
3. **每个 Pass 只能有一个 `UnityPerMaterial` CBUFFER**

可以在 Shader Inspector 中查看 `SRP Batcher: compatible` 来验证。

## 与多 Pass 的冲突

SRP Batch 的一个重要限制：**多 Pass Shader 通常会破坏合批**。

在 Built-in 管线中，SubShader 内的多个 Pass 会按顺序全部执行。但在 URP 中：

- URP 渲染器只执行它识别的特定 `LightMode` 标签对应的 Pass
- 每增加一个新的 Pass（LightMode）就相当于引入了一次额外的 DrawCall，破坏了合批

因此，URP 中实现**透明度混合双面渲染**（需要两个 Pass）时，强烈**不推荐**使用多 Pass 的方式，应优先考虑 Renderer Feature。

## 在 URP 中使用多 Pass 的替代方案

当确实需要多 Pass 时，可以使用以下 `LightMode` 标签组合：

| LightMode | 触发时机 |
| --------- | -------- |
| `UniversalForward` | 默认前向渲染 Pass |
| `SRPDefaultUnlit` | 前向渲染中优先于 UniversalForward 执行 |
| `DepthOnly` | 深度预写阶段（Depth Prepass） |
| `ShadowCaster` | 阴影投射阶段 |

> ⚠️ 使用 `SRPDefaultUnlit` + `UniversalForward` 实现双 Pass 虽然可行，但会导致 SRP Batcher 合批失效，影响性能，生产环境不建议使用。

## 推荐实践

- 尽量用**单 Pass** 完成渲染逻辑
- 需要额外渲染步骤时，优先使用 **Renderer Feature**（`ScriptableRendererFeature`）在架构层面插入额外渲染
- 保持 Shader 符合 SRP Batch 兼容性，用 Frame Debugger 验证合批效果

## 相关知识

- [[w/render-queue|渲染队列]] — 控制渲染顺序，与 SRP Batch 共同影响透明物体的渲染
