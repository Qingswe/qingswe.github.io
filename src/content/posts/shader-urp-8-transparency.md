---
title: 8 透明效果 [URP]
published: 2024-07-06
description: '在渲染透明物体时，渲染顺序至关重要。这是因为透明效果依赖于颜色混合——当前片元的颜色需要与已经写入颜色缓冲区（Color Buffer）的颜色进行叠加计算。'
tags: [Shader, Unity, 图形学, URP]
category: Shader入门精要
draft: false
---

## 8.1 为什么渲染顺序很重要

在渲染透明物体时，渲染顺序至关重要。这是因为透明效果依赖于**颜色混合**——当前片元的颜色需要与已经写入颜色缓冲区（Color Buffer）的颜色进行叠加计算。

对于不透明物体，GPU 会利用**深度缓冲（ZBuffer / Depth Buffer）**来判断遮挡关系，无论渲染顺序如何，最终都能得到正确的遮挡结果。但对于透明物体，由于我们通常需要关闭深度写入（ZWrite Off），GPU 无法通过深度测试来自动排序，因此必须由我们手动控制渲染顺序，**从后往前（Painter's Algorithm，画家算法）**依次渲染，才能得到正确的混合效果。

如果渲染顺序出错，例如先渲染前方的透明物体，再渲染后方的物体，颜色混合的结果就会不正确，看起来像是前后关系颠倒了。

## 8.2 Unity Shader的渲染顺序

Unity 使用**渲染队列（Render Queue）**来控制物体的渲染顺序。我们可以通过在 SubShader 的 Tags 中设置 `Queue` 标签来指定一个物体属于哪个渲染队列。Unity 内置了以下几个渲染队列：

| 名称 | 队列索引 | 说明 |
| --- | --- | --- |
| Background | 1000 | 最先渲染，用于天空盒等背景物体 |
| Geometry | 2000 | 默认队列，用于大多数不透明物体 |
| AlphaTest | 2450 | 使用透明度测试的物体，在所有不透明物体渲染完毕后渲染 |
| Transparent | 3000 | 从后往前渲染，使用透明度混合的物体 |
| Overlay | 4000 | 最后渲染，用于叠加效果，如镜头光晕 |

通常，透明度测试的物体使用 `AlphaTest` 队列，透明度混合的物体使用 `Transparent` 队列。

```csharp
Tags { "Queue" = "Transparent" "RenderType" = "Transparent" "IgnoreProjector" = "True" }
```

`IgnoreProjector` 设置为 True 表示该物体不受投影器（Projector）的影响，这对于透明物体通常是推荐的设置。

## 8.3 透明度测试

透明度测试的实现方式，在进行透明度绘制的时候，为透明度设定一个值，低于该值都会被裁切，也就是不会进行渲染。

而且由于没有开启透明度混合，所以看起来也不是一个半透明的效果，只是将透明度的值当作裁切的基准。透明度测试的效果很极端——要么完全可见，要么完全不可见，无法实现半透明，但它的优点是**不需要关闭深度写入**，因此不存在渲染顺序的问题。

HLSL 中使用 `clip()` 函数来实现透明度测试：

```csharp
// 在片元着色器中
half4 texColor = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, i.uv);
// clip 函数：如果参数为负数，则丢弃该片元
clip(texColor.a - _Cutoff);
// 等同于：
// if (texColor.a - _Cutoff < 0.0) discard;
```

在 SubShader 的 Tags 中应设置：

```csharp
Tags { "Queue" = "AlphaTest" "RenderType" = "TransparentCutout" }
```

## 8.4 透明度混合

这种方式 可以实现真正半透明效果。它会使用到当前片元的透明度，和位于颜色缓冲中的颜色值。

要在Unity中开启混合，我们需要Unity的混合命令Blend，这个命令就是用来将自身的颜色和已经存在于颜色缓冲区中的颜色进行混合的。这个命令还将指定混合时所使用的函数。所有的混合操作运算都是Unity在GPU中已经帮我们做好了的。我们只需要去指定 传入的数值

- Blend Off 关闭混合
- Blend SrcFactor DstFactor
我们把SrcFactor设置为SrcAlpha，DstFactor设置为OneMinusSrcAlpha

$$
DstColor_n = SrcAlpha*SrcColor+(1-SrcAlpha)*DstColor_o
$$

<details>
<summary>SubShader中的设置</summary>

```csharp
SubShader
{
    Tags
    {
        "Queue" = "Transparent" "IgnoreProjector" = "True" "RenderType" = "Transparent"
    }
```

</details>

<details>
<summary>Pass中的设置</summary>

```csharp
Pass
{
	Tags {}
	ZWrite Off
	// 此处将 srcAlpha 和 OneMinusSrcAlpha 作为混合因子  第一个是原颜色，第二个是目标颜色(原先存储的颜色)
	Blend SrcAlpha OneMinusSrcAlpha
```

</details>

<details>
<summary>片元着色器的返回</summary>

```csharp
return half4(ambient + diffuse, texColor.a * _AlphaScale);
```

</details>

但现在的我们由于关闭了深度写入，当遇到复杂的交叉结构时，由于无法确认渲染顺序，我们往往会得到错误的渲染效果。

此外，透明度混合对同一物体自身的多个面也可能产生错误结果，因为同一 Mesh 内部图元的渲染顺序并不确定。

## 8.5 开启深度写入的半透明效果

对于上述问题，一种解决方法是可以使用两个Pass来渲染模型，

第一个Pass开启深度写入，但不输出颜色，目的是向ZBuffer中写入数据

第二个Pass进行正常的透明度混合，由于上个Pass得到了正确的逐像素深度信息，该Pass可以按照像素级别的深度排序进行透明

但这个方法也是有问题，只有最前方的片元会参与渲染，看不到模型内部多个层级的透明混合效果。

具体实现如下：

```csharp
SubShader
{
    Tags { "Queue" = "Transparent" "RenderType" = "Transparent" }

    // 第一个 Pass：只写入深度，不输出颜色
    Pass
    {
        ZWrite On
        ColorMask 0  // 不写入任何颜色通道
    }

    // 第二个 Pass：正常透明度混合
    Pass
    {
        ZWrite Off
        Blend SrcAlpha OneMinusSrcAlpha
        // ... 正常的顶点/片元着色器
    }
}
```

> ⚠️ **URP 注意事项**

> 

> 在 **Built-in 管线**中，SubShader 内的多个 Pass 会被渲染器**自动按顺序全部执行**，因此上述两个 Pass 的写法可以直接生效。

> 

> 但在 **URP（Universal Render Pipeline）** 中，情况完全不同：

> 

> - URP 的渲染器只会执行它**识别的特定 LightMode Tag** 对应的 Pass，未被识别的 Pass 会被直接跳过。

> - 常见的 URP LightMode 有 `UniversalForward`、`ShadowCaster`、`DepthOnly` 等，默认情况下只有 `UniversalForward` 对应的 Pass 参与前向渲染。

> - 因此，**如果你直接在 URP Shader 中写两个无 LightMode Tag 的 Pass，第二个 Pass 不会被执行**。

> 

> **URP 下的替代方案：**

> 

> 1. **推荐：用 **`DepthOnly`** Pass 替代第一个纯深度 Pass。** 给第一个 Pass 打上 `"LightMode" = "DepthOnly"` 标签，URP 的 Depth Prepass 阶段会自动调用它写入深度，第二个 `UniversalForward` Pass 则进行正常的透明混合。这是最符合 URP 架构的做法。

> 

> `c#

> // Pass 1：深度预写

> Pass

> {

> Name "DepthOnly"

> Tags { "LightMode" = "DepthOnly" }

> ZWrite On

> ColorMask 0

> // 只需最简单的顶点变换，无需片元输出

> }

> 

> // Pass 2：前向渲染 + 透明混合

> Pass

> {

> Name "ForwardLit"

> Tags { "LightMode" = "UniversalForward" }

> ZWrite Off

> Blend SrcAlpha OneMinusSrcAlpha

> // 正常着色逻辑

> }

> `

> 

> 2. **不推荐：利用 **`SRPDefaultUnlit`** + **`UniversalForward`** 实现双 Pass。** 如 8.7.2 节中提到的，虽然可行，但会破坏 SRP Batcher 合批，影响性能，不建议在生产环境使用。

> 

> 3. **另一种思路：使用 Renderer Feature。** 在 URP 的 Renderer Asset 中添加自定义 `ScriptableRendererFeature`，在特定渲染阶段插入额外的深度写入 DrawCall，从而在架构层面解决问题，而不是在 Shader 层面堆 Pass。

## 8.6 ShaderLab 混合命令详解

透明度混合使用 `Blend` 命令，本质是一个逐片元的颜色混合操作，公式如下：

$$
O_{rgba} = SrcFactor \times S_{rgba} + DstFactor \times D_{rgba}
$$

其中 $S$ 是当前片元颜色（Source），$D$ 是颜色缓冲中已有颜色（Destination）。

Unity 中常用的混合系数：

| 系数名 | 说明 |
| --- | --- |
| One | 1 |
| Zero | 0 |
| SrcAlpha | 源颜色的 Alpha 值 |
| OneMinusSrcAlpha | 1 - 源颜色的 Alpha 值 |
| DstAlpha | 目标颜色的 Alpha 值 |
| OneMinusDstAlpha | 1 - 目标颜色的 Alpha 值 |
| SrcColor | 源颜色的 RGB 值 |
| DstColor | 目标颜色的 RGB 值 |

常见混合模式示例：

```csharp
// 标准透明混合
Blend SrcAlpha OneMinusSrcAlpha

// 加法混合（叠加发光效果，适合粒子特效）
Blend One One

// 柔和叠加
Blend OneMinusDstColor One

// 正片叠底
Blend DstColor Zero
```

还可以通过 `BlendOp` 命令指定混合操作符（默认是 Add）：

```csharp
BlendOp Sub   // 相减
BlendOp Min   // 取最小值
BlendOp Max   // 取最大值
```

## 8.7 双面渲染的透明效果

如果说我们想要通过去渲染这个物体的内部结构。

我们就需要渲染这个物体的正面和背面。而默认渲染引擎会对物体的背面进行剔除，如果我们要进行双面的渲染，我们可以使用Cull指令来控制剔除哪个面的渲染图元

#### 8.7.1 透明度测试的双面渲染

我们只需要对之前的 AlphaTest 渲染的Shader 的Pass中添加一行就行了

```csharp
Pass
    {
    Tags {}
    Cull Off
```

#### 8.7.2 透明度混合的双面渲染

和透明度测试项目，透明度混合实现双面渲染会更加困难，因为透明度混合需要关闭深度写入，这样我们就很难确定透明物体的绘制顺序。

我们要得到正确的渲染结果，渲染顺序非常重要，我们需要保证图元是从后往前进行渲染的。如果直接像刚才一样关闭剔除功能，我们就无法保证一个物体正面图元和背面图元的渲染顺序，就会得到错误的半透明结果

此时，我肯可以使用一种方法，把双面渲染的工作分成两个Pass，第一个渲染背面，第二个渲染正面，而Unity会去顺序执行 各个Pass

在URP 中，Shader 为了实现SRP Batch 不再提供多Pass的直接支持，因为新的Pass代表新的RenderFeature，就不再支持Pass上的合批，但如果一定要实现的话，我们可以去实现两个Pass 。通过修改Pass的LightMode Tag来实现多个Pass。

SRPDefaultUnlit，在前向渲染中如果设置了该标签，就会优先执行该Pass，然后执行默认的UniversalForward，这样我们就实现了两个Pass。但是强烈不建议写多Pass

UniversalForward 在前向渲染中，默认先执行此Pass

#### Add relevant files