---
title: 13 摄像机纹理 [URP]
published: 2024-07-22
description: '之前实现的运动模糊是基于两个图片之间的层叠，通常不能得到较为准确的效果'
tags: [Shader, Unity, 图形学, URP]
category: Shader入门精要
draft: false
---

### 基于摄像机深度图的运动模糊效果

之前实现的运动模糊是基于两个图片之间的层叠，通常不能得到较为准确的效果

所以我们可以使用摄像机中的深度图去算出来运动的速度，进行运动模糊的计算

#### 我们如何获得运动模糊的速度

想要获得运动模糊的速度，我们需要两个4x4的矩阵，一个是上一帧摄像机的矩阵一个是本帧摄像机的矩阵。摄像机的深度图是一个0－1的数值，这个数值是位于ndc空间中的，线性数值？我们需要将这个点转化为视角空间下的位置，就需要一个从ndc转换到视角空间下的逆矩阵。通过将深度图中的信息转换到视角空间下，得到一帧中移动的速度，来实现运动的模糊

### Post Processing Shader Debug 注意事项

当出现只要在FrameDebugger出现了对应的Pass, 那就代表RenderFeature 和 CustomPass 设置没有错误。

但如果此时摄像机仍然不显示正确的结果，请检查Shader，如果是屏幕上没有展现 Pass 全屏效果，仿佛跟没有绘制Pass 一样，请一定要检查 Vertex 顶点着色器

可以通过在 Frag 当中返回白色，来检查 Vertex 是否正确工作，Vertex 检查完成后检查Frag 片元着色器

即使是在 2022 Unity版本的 URP 中，依旧还是平台的UV差距，还是需要为DirectX 平台的shader 进行y 轴的倒置

#### 对于在RenderFeature 中使用的参数一定要序列化

![image](/images/shader/a6fc1498.png)

#### 根据深度法线图的描边

![image](/images/shader/60e026fa.png)

#### Add relevant files