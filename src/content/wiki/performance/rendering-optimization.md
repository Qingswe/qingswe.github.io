---
title: 渲染优化
description: 汇总 Shader 指令、精度与 Early-Z 相关的渲染优化要点。
tags: [unity, performance, rendering, shader]
updated: 2025-02-27
---
# Shader 指令优化
如果需要对Shader做复杂度优化，可以使用Shader LOD 来完成
## 如何快速定位 Shader 瓶颈
Xcode抓帧，选择Group by Pipeline State，此时会将shader按开销从高到低排列
https://www.bilibili.com/video/BV1Ra411M7aE/?vd_source=87d6628a2e72b87e7260cc3fdba77a81

## 数据类型精度


| Block Feature                               | Type         | Could be Half |
|---------------------------------------------|--------------|----------------|
| **"Space" Block Feature**                   |              |                |
| unity_ObjectToWorld                         | float4x4     | No             |
| unity_WorldToObject                         | float4x4     | No             |
| unity_WorldTransformParams                  | float        | No             |
| **LightMap Block Feature**                  |              |                |
| unity_LightmapST                            | float4       | No             |
| unity_DynamicLightmapST                     | float4       | No             |
| **Render Layer Block Feature**              |              |                |
| unity_RenderingLayer                        | float4       | No             |
| **Spherical Harmonic Block Feature**        |              |                |
| unity_SHAr                                  | float4       | Yes            |
| unity_SHAg                                  | float4       | Yes            |
| unity_SHAb                                  | float4       | Yes            |
| unity_SHBr                                  | float4       | Yes            |
| unity_SHBg                                  | float4       | Yes            |
| unity_SHBb                                  | float4       | Yes            |
| unity_SHC                                   | float4       | Yes            |
| **Probe Volume Block Feature**              |              |                |
| unity_ProbeVolumeParams                     | float4       | No             |
| unity_ProbeVolumeWorldToObject              | float4x4     | No             |
| unity_ProbeVolumeSizeInv                    | float4       | No             |
| unity_ProbeVolumeMin                        | float4       | No             |
| **Probe Occlusion Block Feature**           |              |                |
| unity_ProbesOcclusion                       | float4       | No             |
| **Motion Vector Block Feature**             |              |                |
| unity_MatrixPreviousM                       | float4x4     | No             |
| unity_MatrixPreviousMI                      | float4x4     | No             |
| unity_MotionVectorsParams                   | float4       | No             |
| **Light Indices Block Feature (used in LWRP)**|             |                |
| unity_LightData                             | float4       | Yes            |
| unity_LightIndices[2]                       | float4 (2 elements) | Yes        |
| **Reflection Probe 0 Block Feature**        |              |                |
| unity_SpecCube0_HDR                         | float4       | Yes            |
| **Reflection Probe 1 Block Feature**        |              |                |
| unity_SpecCube1_HDR                         | float4       | Yes            |

Float (32bit)(位置与纹理坐标信息）
Half (16bit)(纹理坐标与颜色信息)
Fixed (11bit)(颜色信息） (SPR下已不支持)
与空间位置相关的计算推荐float，与uv纹理、颜色 相关推荐half
### 尽量使用内置函数
- pow
- normalize
- dot
- inversesqrt
### 超越函数
exp
log
sin, cos, tan...
asin, acos, atan,atan2...
sincos

资源密集型函数，在低端设备上少用
### 指令周期与阶段
![](/images/performance/渲染优化.png)
长度一致的指令Cycle更有助于 SIMD 的并行计算
**指令优化**
![](/images/performance/渲染优化-1.png)
![](/images/performance/渲染优化-2.png)
![](/images/performance/渲染优化-3.png)
![](/images/performance/渲染优化-4.png)

![](/images/performance/渲染优化-5.png)
### 可能导致Early-Z失效的操作
开启Alpha Test
Clip()
Discard
Alpha Coverage
光栅化后修改深度
手动关闭Depth Test
## 某些平台慎用或推荐用某些内置功能
Alpha Test
Color Mask
sRGB硬件解压
