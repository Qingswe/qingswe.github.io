---
title: 切线空间
description: 以模型表面为参考系建立的局部坐标系，由切线、副切线和法线三个正交基向量构成
tags: [图形学, Shader, 数学, 坐标系]
updated: 2024-07-03
---

## 什么是切线空间？

切线空间（Tangent Space）是一种**以模型表面为参考系**建立的局部坐标空间，每个顶点都有自己独立的切线空间。它由三个正交基向量定义：

| 轴 | 向量 | 含义 |
| -- | ---- | ---- |
| X | 切线 T（Tangent） | 沿纹理 U 方向 |
| Y | 副切线 B（Bitangent / Binormal） | 沿纹理 V 方向 |
| Z | 法线 N（Normal） | 垂直于表面 |

## TBN 矩阵

TBN 矩阵（Tangent-Bitangent-Normal Matrix）是描述切线空间与世界空间之间变换关系的矩阵：

```hlsl
// 在顶点着色器中构建 TBN 矩阵（切线空间 → 世界空间）
float3 N = TransformObjectToWorldNormal(IN.normalOS);
float3 T = TransformObjectToWorldDir(IN.tangentOS.xyz);
// tangentOS.w 决定副切线朝向，处理镜像缩放
float3 B = cross(N, T) * IN.tangentOS.w * GetOddNegativeScale();

float3x3 TBN = float3x3(T, B, N); // 行为 T/B/N（世界空间→切线空间）
```

- **TBN 矩阵**（列向量形式）：将切线空间向量变换到世界空间
- **TBN 矩阵的转置**（行向量形式）：将世界空间向量变换到切线空间（正交矩阵的逆等于转置）

## 为什么使用切线空间？

切线空间在法线贴图中被广泛使用，主要优势：

1. **可复用性**：存储的是相对于表面的法线偏移，同一张法线贴图可以应用于不同朝向的表面
2. **可压缩**：切线空间法线的 Z 分量（正向）始终大于 0，XY 分量可以恢复 Z，因此只需存储 XY
3. **动画友好**：模型骨骼动画时，切线空间随顶点移动，法线贴图效果依然正确

## 在光照计算中的应用

### 方案一：在切线空间中计算光照

将光照方向和视角方向从世界空间变换到切线空间，法线直接从法线贴图解码后使用：

```hlsl
// 世界空间→切线空间矩阵（worldToTangent）= TBN 的转置
float3x3 worldToTangent = float3x3(worldTangent, worldBinormal, worldNormal);
OUT.lightDirTS = mul(worldToTangent, mainLight.direction);
OUT.viewDirTS  = mul(worldToTangent, GetWorldSpaceViewDir(worldPos));
```

### 方案二：在世界空间中计算光照（推荐）

将法线从切线空间变换到世界空间，然后在世界空间进行光照计算：

```hlsl
// mul(tangentNormal, TBN) 等价于 n.x*T + n.y*B + n.z*N
float3 worldNormal = normalize(mul(tangentNormal, TBN));
```

## 相关知识

- [[w/normal-map|法线贴图]] — 存储在切线空间中的法线信息
