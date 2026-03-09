---
title: UGamePlayStatics
description: UGameplayStatics 提供的常用游戏工具函数集合。
tags: [unreal, wiki, gameplay-statics, utility]
updated: 2025-11-27
---

很多GamePlay相关的七七八八的功能都在。建议过一遍

## 它是什么

`UGameplayStatics` 是一个“高频杂项工具箱”，把很多与 Gameplay 相关、但又不适合挂到某个单独对象上的静态函数集中到了一起。

它的特点是：

- 大多是 `static` 函数，调用方便
- 涉及关卡、存档、音效、对象查找、玩家获取等通用逻辑
- 对蓝图也很友好，因此在蓝图项目里使用频率很高

## 常见分类

### 关卡切换

```cpp
UGameplayStatics::OpenLevel(this, FName("MainMap"));
```

- `OpenLevel`：切换关卡
- `GetCurrentLevelName`：获取当前关卡名

### 存档

```cpp
USaveGame* SaveObject = UGameplayStatics::CreateSaveGameObject(UMySaveGame::StaticClass());
UGameplayStatics::SaveGameToSlot(SaveObject, TEXT("Profile_01"), 0);
```

- `CreateSaveGameObject`
- `SaveGameToSlot`
- `LoadGameFromSlot`
- `DoesSaveGameExist`
- `DeleteGameInSlot`

这部分和 [[w/unreal/存档系统|存档系统]] 强关联。

### 玩家与控制器获取

- `GetPlayerController`
- `GetPlayerPawn`
- `GetPlayerCharacter`
- `GetAllActorsOfClass`

其中 `GetAllActorsOfClass` 很常见，但也很容易被滥用。一次性全场景查找不适合放在高频逻辑里。

### 音效与特效

- `PlaySound2D`
- `PlaySoundAtLocation`
- `SpawnEmitterAtLocation`
- `SpawnDecalAtLocation`

这类函数适合快速播放一次性表现。

### 游戏流程辅助

- `SetGamePaused`
- `GetGameMode`
- `GetGameState`
- `ApplyDamage`

## 为什么它常用

很多系统你都能在别的类上找到更“原教旨”的入口，但 `UGameplayStatics` 提供了一个统一、低心智负担的调用点。

适合：

- 蓝图调用
- 原型开发
- 跨模块快速取常见对象

不适合：

- 高频性能敏感逻辑
- 复杂系统的核心抽象层

## 使用经验

- 只要看起来像“全局通用能力”，先想一眼有没有 `UGameplayStatics`
- 如果开始大量依赖 `GetAllActorsOfClass`、`GetPlayerCharacter` 这种便捷函数，说明架构可能还不够稳定
- 对大型系统，通常会逐步从 `UGameplayStatics` 迁移到更明确的管理器或子系统接口