---
title: Unity 中的 Culling
description: 整理 Unity 场景中剔除、简化与合批的常见思路。
tags: [unity, performance, culling, batching]
updated: 2025-02-20
---
## 简单的例子
比如一个桃子加工工厂，我们需要对桃子从源头拿到做成产品分发到不同地方。
Culling 就可以理解为，在进入工厂前，将一些品质不好，腐烂的不符合生产标准的桃子剔除
Simplization 我们就可以理解为将桃子 进行分类，决定制作什么产品
Batching 就好比，我们将不同期限的 产品，按照目标地的需求，时间需求的上飞机，大量需求的上火车，比如一天一发货，一周一发货等，分别装箱发送。保证下游不断获得供应，不影响生产加工

## Culling
### 哪些是需要剔除的内容
广义上讲：
- 看不见的像素、网格和对象
- 重复的、用不到的资源
- 不需要、不执行的代码
### 如何剔除
像素剔除：摄像机平截头体剔除、Back-face Culling、Early-Z 提前深度测试、Pre-Z Pass
网格剔除：Layer Mask、可见距离剔除、遮挡剔除Occlusion Culling
灯光剔除:Tile-Based Deferred Rendering、Forward+
场景剔除：Additive Scene 根据游戏内容，做动态的场景卸载加载，实现场景的动态剔除
#### 用户扩展剔除
场景数据结构：Octree、BSP Tree、Portal、体素化Voxelization、SDF等
GPU Culling: Hi-Z Pass、 Temporal Reprojection Culling、Cluster、Tile-based Visible Buffer等

## Simplization
### 哪些是需要简化的内容
广义上讲
运行效率较重的资源，基于现有的资源进行简化
低效、不合适功能
### 简化的手段
- Quality Settings
- 通过烘焙光照简化实时光照
- 通过BoundingBox或替代体碰撞代替Mesh碰撞
- 通过LocalVolume代替GlobalVolume
- RayCast代替SphereCast、CapsuleCast等
- 纹理文字代替系统文字
- Mesh LOD
- Shader LOD
- HLOD
- 通过CamerOverride代替URP管线中的一些通用设置
- 各种OnDemand更新或分级设置接口
### 用户扩展简化
- 场景简化数据结构
- 第三方LOD方案
- Mesh Impostor
- Animation LOD 根据视距降低远处的动画频率
- 骨骼LOD
- 2D寻路代替NavigationMesh
- 扩展类似OnDemand接口

Q：2D分层地图寻路，路点寻路
## Batching
