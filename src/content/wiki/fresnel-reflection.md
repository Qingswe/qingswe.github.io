---
title: 菲涅尔反射
description: 描述光在两种介质交界面处反射率随观察角度变化的物理现象，视线越平行于表面反射越强
tags: [图形学, Shader, 物理渲染, 光照]
updated: 2024-07-09
---

## 什么是菲涅尔反射？

菲涅尔反射（Fresnel Reflection）是一种真实世界中普遍存在的光学现象：**当视线与表面法线的夹角越大（越掠射），反射就越强**。

日常例子：
- 垂直俯视平静的水面 → 几乎能看穿水底，反射很弱
- 从水平方向看水面 → 水面像镜子一样，反射很强
- 玻璃窗在正面看是透明的，斜视时变成镜子

这个现象在几乎所有非金属表面都存在，是 PBR（物理渲染）的重要组成部分。

## Schlick 菲涅尔近似公式

精确的菲涅尔方程计算开销较大，游戏中通常使用 **Schlick 近似**：

$$
F(v, n) = F_0 + (1 - F_0)(1 - v \cdot n)^5
$$

其中：
- $F_0$：法线入射时的反射率（基础反射系数），不同材质取值不同
- $v$：视角方向（单位向量）
- $n$：表面法线（单位向量）
- $v \cdot n$：视线与法线的夹角余弦值，越小表示越掠射

当 $v \cdot n = 0$（完全掠射）时，$F = 1$（完全反射）；当 $v \cdot n = 1$（正视）时，$F = F_0$（最小反射）。

## HLSL 实现

```hlsl
// Schlick 菲涅尔近似
half fresnel = _FresnelScale + (1 - _FresnelScale) * pow(1 - dot(worldNormal, worldViewDir), 5);

// 根据菲涅尔值在漫反射和环境反射之间插值
half3 color = lerp(diffuse, reflection, saturate(fresnel));
```

其中 `_FresnelScale` 对应公式中的 $F_0$，控制正视时的基础反射强度。

## 在 Unity Shader 中的完整应用

```hlsl
Properties
{
    _FresnelScale("Fresnel Scale", Range(0, 1)) = 0.5
    _Cubemap("Reflection Cubemap", Cube) = "_Skybox" {}
}

// 片元着色器
half3 reflDir = reflect(-worldViewDir, worldNormal);
half3 reflection = SAMPLE_TEXTURECUBE(_Cubemap, sampler_Cubemap, reflDir).rgb;

half fresnel = _FresnelScale + (1 - _FresnelScale) * pow(1 - dot(worldNormal, worldViewDir), 5);
half3 finalColor = ambient + lerp(diffuse, reflection, saturate(fresnel)) * atten;
```

## 不同材质的 F₀ 参考值

| 材质 | F₀ 近似值 |
| ---- | --------- |
| 水 | 0.02 |
| 玻璃 | 0.04 |
| 塑料 | 0.04 |
| 金属（铁） | 0.56 |
| 金属（金） | 1.0 |

金属的菲涅尔效果较弱（反射率在各角度都很高），非金属的菲涅尔效果更明显。

## 相关知识

- [[w/cubemap|CubeMap]] — 菲涅尔反射通常采样 CubeMap 来获取环境颜色
