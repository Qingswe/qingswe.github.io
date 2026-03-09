---
title: Character
description: 虚幻引擎中 Character 类的定位与常见用途。
tags: [unreal, wiki, character, pawn]
updated: 2025-11-26
---

一种特殊的Pawn类，主要服务于人形。
人形角色有很多共有的功能，所以会有一个Character去持有这些通用的组件，避免重复添加相同组件。

## Character 的定位

`Character` 是 [[w/unreal/pawn|Pawn]] 的常用子类，专门服务于“站在地面上移动的人形或类人角色”。

它不是单纯多了几个组件，而是直接内置了一套很成熟的角色移动框架，尤其适合：

- 玩家角色
- 敌人 AI
- 需要跳跃、落地、重力、坡度处理的角色

## 默认自带的核心组件

一个 `Character` 通常默认包含：

- `CapsuleComponent`：作为碰撞主体
- `CharacterMovementComponent`：负责移动、跳跃、下落和常见网络移动同步
- `SkeletalMeshComponent`：显示角色骨骼与动画

这也是为什么人形角色一般直接继承 `Character`，而不是从 `Pawn` 重新手搓一整套移动系统。

## 和 Pawn 的区别

[[w/unreal/pawn|Pawn]] 强调“可被控制”。

`Character` 在此基础上额外解决了：

- 地面移动
- 重力和空中状态
- 跳跃
- 朝向控制
- 导航与移动输入整合
- 多人游戏下常见的角色移动同步

如果只是一个简单飞行器、摄像机、棋子、无人机，不一定要用 `Character`，普通 `Pawn` 往往更轻。

## 常见移动入口

最常用的移动接口是：

```cpp
AddMovementInput(GetActorForwardVector(), Value);
```

跳跃通常直接调用：

```cpp
Jump();
StopJumping();
```

移动能力的主体其实在 `CharacterMovementComponent` 上，常见配置包括：

- `MaxWalkSpeed`
- `JumpZVelocity`
- `AirControl`
- `BrakingDecelerationWalking`
- `GravityScale`

## 什么时候该选 Character

优先选择 `Character`：

- 角色需要行走、奔跑、跳跃
- 角色要接入动画蓝图、根运动、蒙太奇
- 角色要由 AIController 驱动导航移动

优先选择 `Pawn`：

- 对象不是人形
- 不需要复杂地面移动
- 想完全自定义移动规则

## 开发经验

- 角色朝向控制经常和 `Use Controller Rotation Yaw`、`Orient Rotation to Movement` 一起调整
- 许多“角色动不了”的问题，本质是 `CharacterMovementComponent` 配置不对
- 如果只是为了“能被控制”就上 `Character`，有时候会引入不必要的复杂度

Next:
[[w/unreal/blendspace|BlendSpace]]