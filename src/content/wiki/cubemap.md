---
title: CubeMap（立方体贴图）
description: 由六张纹理组成、模拟环境的特殊纹理类型，常用于实现反射、折射和天空盒效果
tags: [图形学, Shader, Unity, 纹理]
updated: 2024-07-09
---

## 什么是 CubeMap？

CubeMap（立方体贴图）是一种特殊的纹理类型，由**六张朝向不同方向的正方形纹理**拼接而成，分别对应立方体的六个面（+X、-X、+Y、-Y、+Z、-Z）。可以把它想象成一个包裹场景的"环境盒"。

在 HLSL/Shader 中，CubeMap 使用**方向向量**进行采样，而不是普通的 UV 坐标：

```hlsl
// 声明 CubeMap
TEXTURECUBE(_CubeMap);
SAMPLER(sampler_CubeMap);

// 使用反射方向采样 CubeMap
half3 reflection = SAMPLE_TEXTURECUBE(_CubeMap, sampler_CubeMap, reflectDir).rgb;
```

## 主要应用场景

### 反射（Reflection）

通过计算视线相对于表面法线的反射向量，从 CubeMap 对应方向采样，模拟镜面反射环境：

```hlsl
// 在顶点着色器中计算反射方向（性能更好）
OUT.reflectDir = reflect(-viewDirWS, normalWS);

// 在片元着色器中采样
half3 reflCol = SAMPLE_TEXTURECUBE(_CubeMap, sampler_CubeMap, reflectDir).rgb;
```

> 反射方向在顶点着色器中计算（而非片元着色器）是出于性能考虑，两者效果差异通常很小。

### 折射（Refraction）

基于斯涅尔定律（Snell's Law）计算折射方向：

$$
n_1 \sin\theta_1 = n_2 \sin\theta_2
$$

其中 $n_1$、$n_2$ 是两种介质的折射率，$\theta_1$、$\theta_2$ 是入射角和折射角。HLSL 内置了 `refract()` 函数来完成这个计算。

### 天空盒（Skybox）

Unity 的天空盒本质上就是一个包裹整个场景的超大 CubeMap，渲染在 Background 队列（队列索引 1000），最先渲染。

## 与渲染纹理结合

在动态反射场景中，可以将场景实时渲染到 CubeMap（Render Texture），然后在反射 Shader 中采样，实现**动态环境反射**。比静态 CubeMap 效果更真实，但性能消耗更高。

## 在 Unity Inspector 中的属性类型

```hlsl
// Shader Properties 中声明 CubeMap
_CubeMap("Reflection Cubemap", Cube) = "_Skybox" {}
```

`"_Skybox"` 表示默认使用当前场景的天空盒。

## 相关知识

- [[w/fresnel-reflection|菲涅尔反射]] — 结合 CubeMap 实现更真实的边缘反射效果
- [[w/normal-map|法线贴图]] — 常与 CubeMap 配合，让反射/折射表面有凹凸细节
