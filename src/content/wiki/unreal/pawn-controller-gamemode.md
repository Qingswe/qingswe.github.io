---
title: Pawn、Controller 与 GameMode
description: 虚幻引擎中 Pawn、Controller 和 GameMode 的核心概念与关系
tags: [Unreal, Actor]
updated: 2025-11-26
---

# Pawn、Controller 与 GameMode

## 概述

【重点】Pawn、Controller 和 GameMode 是 Unreal Engine 中三个核心的游戏架构类，它们共同构成了游戏世界中的控制体系：

- **Pawn**：代表可被控制的实体（玩家或 AI 的化身）
- **Controller**：负责控制逻辑和输入处理
- **GameMode**：管理游戏规则、玩家生成和游戏流程

---

# Pawn

## 核心概念

【重点】**Pawn** 与 Actor 的最大区别就是可以**被玩家或者 AI 逻辑进行控制**。

- Pawn 继承自 Actor，拥有 Actor 的所有基本功能
- 【重点】Pawn 可以被 Controller 所"拥有（Possess）"和控制
- 对于不同的 Pawn 类，我们会有不同的控制逻辑，也就是需要不同的 Controller

## 职责划分

【重点】Pawn 或者说 Actor 类负责的是：
- 物体的显示（渲染）
- 物理表现（碰撞、移动）
- 动作执行（动画、特效）
- 在场景中的表现

## 常见子类

- **Character**：人形角色，预设了 `CharacterMovementComponent` 和 `CapsuleComponent`
- **DefaultPawn**：简单的默认 Pawn，通常用于测试

---

# Controller

## 核心概念

【重点】**Controller** 是负责"思考"和发出指令的实体，而 Pawn 是执行这些指令的"身体"。

Controller 在类中处理不同的输入控制逻辑，实现了**控制逻辑与实体表现的分离**。

## 主要职责

- 处理玩家输入（键盘、鼠标、手柄等）
- 控制 Pawn 的行为和移动
- AI 决策逻辑（对于 AIController）
- 管理 Pawn 的生命周期

## 输入处理

【技巧】**强烈建议将输入事件的处理写入 Controller 的 `SetupInputComponent` 重载中**。

```cpp
void AMyPlayerController::SetupInputComponent()
{
    Super::SetupInputComponent();
    
    // 绑定输入事件
    InputComponent->BindAction("Jump", IE_Pressed, this, &AMyPlayerController::Jump);
    InputComponent->BindAxis("MoveForward", this, &AMyPlayerController::MoveForward);
}
```

## Possess（拥有机制）

### 核心功能

【重点】**Possess** 用于动态绑定不同的 Pawn 类，实现控制权的转移。

### 常用方法

- `Possess(Pawn*)`：让 Controller 拥有指定的 Pawn
- `UnPossess()`：解除当前拥有的 Pawn
- `GetPawn()`：获取当前拥有的 Pawn

### 应用场景

- 玩家切换角色
- 玩家进入载具
- AI 控制不同的敌人
- 实现"灵魂出窍"等特殊功能

### 示例代码

```cpp
// 在 Controller 中切换控制的 Pawn
void AMyPlayerController::SwitchToNewPawn(APawn* NewPawn)
{
    if (NewPawn)
    {
        UnPossess();
        Possess(NewPawn);
    }
}
```

## Controller 类型

- **PlayerController**：玩家控制器，处理玩家输入
- **AIController**：AI 控制器，处理 AI 逻辑

---

# GameMode

## 核心概念

【重点】**GameMode** 继承自 `GameModeBase`，职责包括：

- 玩家的生成与管理
- 游戏流程控制
- 游戏规则的执行
- 仅次于核心的六个大类，具有**单例的特性**

【注意】在切换关卡或场景的时候，要将 GameMode 与关卡或场景进行绑定，**一个场景只会有一个 GameMode**。

## 为什么引入 GameMode？

【重点】GameMode 的引入主要是为了：
- **方便多人网络游戏模块设计**：统一管理游戏规则和玩家状态
- **游戏流程控制**：管理游戏开始、结束、暂停等状态
- **玩家管理**：控制玩家的生成、重生、移除等
- **规则执行**：统一执行游戏规则，如得分、时间限制等

## GameMode 设置

### 全局 GameMode

【技巧】在 **项目设置 -> 项目 -> 地图和模式** 中设置全局 GameMode。

- 每当进入到关卡当中，会自动生成 GameMode
- 并顺带生成一系列的类作为入口初始化：
  - PlayerController
  - Pawn
  - HUD
  - PlayerState
  - GameState

### 关卡级 GameMode（第二入口）

【技巧】在 **世界场景设置** 当中，搜索找到"游戏模式"，选择新的游戏模式来重载。

- 如果这个窗口内没有设置游戏模式，则会默认使用上面的全局游戏模式
- 允许不同关卡使用不同的游戏模式
- 优先级：关卡设置 > 全局设置

## GameMode 生命周期

1. **InitGame**：游戏初始化时调用
2. **BeginPlay**：游戏开始时调用
3. **EndPlay**：游戏结束时调用

## 常用功能

### 玩家生成

```cpp
// 在 GameMode 中生成玩家
APawn* AMyGameMode::SpawnDefaultPawnFor_Implementation(AController* NewPlayer, AActor* StartSpot)
{
    // 自定义玩家生成逻辑
    return Super::SpawnDefaultPawnFor_Implementation(NewPlayer, StartSpot);
}
```

### 游戏规则

- 设置游戏时间限制
- 管理得分系统
- 控制游戏状态（开始、进行中、结束）

---

# 三者关系

## 架构关系

```
GameMode (游戏规则)
    ↓ 管理
PlayerController (控制逻辑)
    ↓ Possess
Pawn (实体表现)
    ↓ 继承
Actor (基础类)
```

## 数据流向

1. **GameMode** 决定生成什么类型的 **Pawn** 和 **Controller**
2. **Controller** 通过 **Possess** 拥有 **Pawn**
3. **Controller** 接收输入，控制 **Pawn** 的行为
4. **Pawn** 在场景中表现和执行动作

---

# 最佳实践

## 职责分离

- 【重点】**[[w/unreal/pawn|Pawn]]**：只负责表现和物理，不处理输入逻辑
- 【重点】**Controller**：只处理输入和控制逻辑，不直接操作渲染
- 【重点】**GameMode**：只管理游戏规则和流程，不直接控制单个玩家

## 代码组织

- 输入绑定放在 Controller 的 `SetupInputComponent` 中
- 移动逻辑可以放在 Pawn 或 MovementComponent 中
- 游戏规则和玩家管理放在 GameMode 中

---

# Tips

## Editor 中的实时代码编写选项

【技巧】在 Unreal Editor 中，可以通过以下方式启用实时代码编写：

- **编辑 -> 编辑器偏好设置 -> 常规 -> 源代码编辑器**
- 启用"实时编译"选项，可以在编辑器中直接修改代码并实时看到效果

## 调试技巧

- 使用 `GEngine->AddOnScreenDebugMessage()` 在游戏中显示调试信息
- 在 Controller 中检查 `GetPawn()` 是否为 nullptr
- 使用断点调试 Possess/UnPossess 流程

---

# Next :
[[w/unreal/gameinstance|GameInstance]]

# 相关链接

- [[w/unreal/pawn|Pawn]] - Pawn 的详细说明
- [[w/unreal/actor创建与销毁|Actor创建与销毁]] - Actor 的生命周期