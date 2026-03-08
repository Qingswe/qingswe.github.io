---
title: 渲染队列
description: Unity 用于控制物体渲染顺序的机制，通过队列索引值决定不同类型物体的绘制先后
tags: [图形学, Shader, Unity, 渲染]
updated: 2024-07-06
---

## 什么是渲染队列？

渲染队列（Render Queue）是 Unity 用于**控制物体渲染顺序**的机制。通过在 SubShader 的 Tags 中设置 `Queue` 标签，可以指定一个物体属于哪个渲染阶段。Unity 渲染器会按照队列索引值从小到大依次渲染。

```hlsl
Tags { "Queue" = "Transparent" "RenderType" = "Transparent" }
```

## 内置渲染队列

| 名称 | 队列索引 | 用途 |
| ---- | -------- | ---- |
| Background | 1000 | 最先渲染，用于天空盒等背景 |
| Geometry | 2000 | 默认队列，大多数不透明物体 |
| AlphaTest | 2450 | 透明度测试物体，在不透明物体之后渲染 |
| Transparent | 3000 | 透明度混合物体，从后往前渲染 |
| Overlay | 4000 | 最后渲染，镜头光晕等叠加效果 |

也可以使用相对值，例如 `"Queue" = "Transparent+1"` 来微调顺序。

## 为什么顺序很重要？

对于**不透明物体**，GPU 通过深度测试可以自动处理遮挡，渲染顺序无所谓。

对于**透明物体**，由于依赖颜色混合（将当前片元颜色与颜色缓冲中的颜色叠加），必须**从后往前**渲染才能得到正确结果——这就是**画家算法（Painter's Algorithm）**。

## 两种透明效果的队列选择

### 透明度测试（Alpha Test）

使用 `clip()` 函数根据 Alpha 值丢弃片元，效果只有完全可见或完全不可见两种状态：

```hlsl
Tags { "Queue" = "AlphaTest" "RenderType" = "TransparentCutout" }

// 片元着色器中
clip(texColor.a - _Cutoff);  // Alpha 低于阈值则丢弃该片元
```

**优点**：不需要关闭深度写入，没有渲染顺序问题。

### 透明度混合（Alpha Blend）

使用 `Blend` 命令进行颜色混合，可实现真正的半透明效果：

```hlsl
Tags { "Queue" = "Transparent" "RenderType" = "Transparent" "IgnoreProjector" = "True" }

Pass
{
    ZWrite Off
    Blend SrcAlpha OneMinusSrcAlpha
}
```

混合公式：`Output = SrcAlpha × SrcColor + (1 - SrcAlpha) × DstColor`

**缺点**：需要关闭深度写入，复杂交叉结构可能出现渲染错误。

## 常用混合模式

| 写法 | 效果 |
| ---- | ---- |
| `Blend SrcAlpha OneMinusSrcAlpha` | 标准透明混合 |
| `Blend One One` | 加法混合（发光、粒子特效） |
| `Blend DstColor Zero` | 正片叠底 |
| `Blend OneMinusDstColor One` | 柔和叠加 |

## 相关知识

- [[w/depth-buffer|深度缓冲]] — 与渲染顺序密切相关的 GPU 缓冲区
- [[w/srp-batch|SRP Batch]] — URP 中影响多 Pass 透明渲染的合批技术
