---
title: 9 更复杂的光照
published: 2026-03-08
description: '在URP中因为SRPBatch功能，取消了多Pass，原先Standrard中用于进行多光源渲染的AdditionalPass不存在了，但我们可以直接在一个Pass拿到Additional Lights的信息获取多光源的渲染结果。此处要注意！！Forward 和 Forward+ 渲染通道对于多光源...'
tags: [Shader, Unity, 图形学, URP]
category: Shader入门精要
draft: false
---

### URP 多光源踩坑实录

在URP中因为SRPBatch功能，取消了多Pass，原先Standrard中用于进行多光源渲染的AdditionalPass不存在了，但我们可以直接在一个Pass拿到Additional Lights的信息获取多光源的渲染结果。此处要注意！！Forward 和 Forward+ 渲染通道对于多光源的处理是不一样的，用在Forward上的处理方法到Forward+中就会失效，此处就可以参考 Unity URP Lit Shader 中对于多光源照明的实现 ForwardPass。

### 9.4.2 不透明物体的阴影

设置方面，我们需要在Light 中设置 ShadowType

原版本中的 

`ReceiveShadows `在URP的Lit材质中拥有ReceiveShadows的设置，`Mesh Renderer` 中没有，所以我们要注意在写这方面Shader 时，添加对 ReceiveShadows 的处理，添加 Toggle 等

CastShadows 在MeshRenderer中设置

同时要注意的是，当我们在Shader 中没有写 关于LightMode ShadowCast Pass相关的内容时，Unity会先去 Fallback 中去查找对应的Pass 并应用。如果Fallback中没有或是我们没有设置Fallback，就不存在对于 ShadowCast 的处理

如果在光源投射的方向上 面被剔除的话，此时也是不会投射影子的

但我们可以在材质中更改 面的渲染剔除类型，来投射影子

![image](https://prod-files-secure.s3.us-west-2.amazonaws.com/2a7b777d-4df6-4360-9370-996d14cf5323/84d6f4f4-ba07-4cf5-b882-f06e42f0f4f9/Untitled.png)

![image](https://prod-files-secure.s3.us-west-2.amazonaws.com/2a7b777d-4df6-4360-9370-996d14cf5323/333a1167-d68a-4f8a-aaf4-42fa7943574b/Untitled.png)

![image](https://prod-files-secure.s3.us-west-2.amazonaws.com/2a7b777d-4df6-4360-9370-996d14cf5323/8aeb2118-6e17-47fa-b0cb-c87980d18385/Untitled.png)

但我们会发现，立方体的颜色还是没有变化，那是因为我们还没有 进行接收阴影的相关操作，所以不会对投射来的阴影做出变化

[Use shadows in a custom URP shader | Universal RP | 12.1.15 (unity3d.com)](https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@12.1/manual/use-built-in-shader-methods-shadows.html?q=GetAdditionalLightShadowFade)

#### Add relevant files