---
title: GameInstance
description: 虚幻引擎中 GameInstance 的核心概念与使用
tags: [unreal, wiki, core-concept, gameinstance, singleton]
updated: 2025-11-26
---

# GameInstance

## 概述

【重点】**GameInstance** 是 Unreal Engine 中用于管理游戏全局状态和跨关卡数据的核心类。

- 使用了**单例的设计模式**，整个游戏运行期间只有一个实例
- 在 Unreal 中不存在 Unity 的 `DontDestroyOnLoad` 概念
- 当需要信息跨越关卡时，就需要使用 GameInstance
- 更常用的功能是管理玩家的信息和存档等功能

## 核心概念

### 生命周期

【重点】GameInstance 的生命周期贯穿整个游戏进程：

- **创建时机**：游戏启动时创建，比任何关卡都早
- **销毁时机**：游戏完全退出时才会销毁
- **跨关卡持久化**：切换关卡时不会被销毁，数据得以保留

### 与 Unity 的对比

| Unity | Unreal Engine |
|-------|---------------|
| `DontDestroyOnLoad` | `GameInstance` |
| 场景切换时手动设置 | 自动跨关卡持久化 |
| 需要手动管理单例 | 引擎自动管理单例 |

## 主要职责

### 1. 跨关卡数据管理

【重点】GameInstance 最常见的用途是保存需要在多个关卡之间共享的数据：

- 玩家信息（等级、经验、装备等）
- 游戏设置（音效、画质等）
- 存档数据
- 网络会话信息
- 全局游戏状态

### 2. 游戏初始化

- 初始化游戏系统
- 加载配置文件
- 设置全局参数

### 3. 网络会话管理

- 管理多人游戏的会话
- 处理网络连接状态
- 管理服务器列表

## 结构层级图

![[w/unreal/gameinstance.png|GameInstance.png]]

## 使用方式

### 创建自定义 GameInstance

【技巧】在项目设置中指定自定义的 GameInstance 类：

1. **编辑 -> 项目设置 -> 游戏 -> Game Instance Class**
2. 选择或创建继承自 `UGameInstance` 的 C++ 类或 Blueprint 类

### C++ 实现示例

```cpp
// MyGameInstance.h
UCLASS()
class MYGAME_API UMyGameInstance : public UGameInstance
{
    GENERATED_BODY()

public:
    UMyGameInstance();

    // 玩家数据
    UPROPERTY(BlueprintReadWrite, Category = "Player")
    int32 PlayerLevel = 1;

    UPROPERTY(BlueprintReadWrite, Category = "Player")
    int32 PlayerExperience = 0;

    // 游戏设置
    UPROPERTY(BlueprintReadWrite, Category = "Settings")
    float MasterVolume = 1.0f;

    // 初始化函数
    virtual void Init() override;
    virtual void Shutdown() override;
};
```

```cpp
// MyGameInstance.cpp
void UMyGameInstance::Init()
{
    Super::Init();
    
    // 初始化游戏系统
    // 加载存档数据
    // 设置全局参数
}

void UMyGameInstance::Shutdown()
{
    // 保存数据
    // 清理资源
    
    Super::Shutdown();
}
```

### 在代码中访问 GameInstance

【技巧】通过 `GetGameInstance()` 方法获取 GameInstance 实例：

```cpp
// 在任何 Actor 或 Component 中
UMyGameInstance* GameInstance = Cast<UMyGameInstance>(GetGameInstance());
if (GameInstance)
{
    // 访问或修改 GameInstance 的数据
    GameInstance->PlayerLevel = 10;
    GameInstance->PlayerExperience += 100;
}
```

### Blueprint 中使用

在 Blueprint 中可以通过以下节点访问 GameInstance：

- `Get Game Instance` 节点
- 直接访问自定义的变量和函数

## 常见用途

### 1. 玩家数据管理

```cpp
// 保存玩家数据
UPROPERTY(BlueprintReadWrite, Category = "Player Data")
FPlayerSaveData PlayerData;

// 加载玩家数据
void UMyGameInstance::LoadPlayerData()
{
    // 从文件或服务器加载数据
}

// 保存玩家数据
void UMyGameInstance::SavePlayerData()
{
    // 保存数据到文件或服务器
}
```

### 2. 游戏设置管理

```cpp
// 音效设置
UPROPERTY(BlueprintReadWrite, Category = "Settings")
float MasterVolume = 1.0f;

UPROPERTY(BlueprintReadWrite, Category = "Settings")
float MusicVolume = 1.0f;

// 图形设置
UPROPERTY(BlueprintReadWrite, Category = "Settings")
int32 GraphicsQuality = 2;
```

### 3. 关卡切换管理

```cpp
// 切换关卡时保存当前状态
void UMyGameInstance::TravelToLevel(const FString& LevelName)
{
    // 保存当前关卡的状态
    SaveCurrentLevelState();
    
    // 切换关卡
    GetWorld()->ServerTravel(LevelName);
}
```

## 生命周期函数

### Init

【重点】在游戏启动时调用，早于任何关卡的 `BeginPlay`：

```cpp
virtual void Init() override;
```

**用途**：
- 初始化游戏系统
- 加载配置文件
- 设置全局参数
- 初始化网络会话

### Shutdown

【重点】在游戏完全退出时调用：

```cpp
virtual void Shutdown() override;
```

**用途**：
- 保存游戏数据
- 清理资源
- 关闭网络连接

## 与其他系统的关系

### GameInstance vs GameMode

| 特性 | GameInstance | GameMode |
|------|--------------|----------|
| 生命周期 | 整个游戏进程 | 单个关卡 |
| 数量 | 全局唯一 | 每个关卡一个 |
| 用途 | 跨关卡数据 | 关卡内游戏规则 |
| 销毁时机 | 游戏退出 | 关卡切换 |

### GameInstance vs GameState

| 特性 | GameInstance | GameState |
|------|--------------|-----------|
| 作用域 | 客户端和服务器各自独立 | 服务器权威，同步到客户端 |
| 用途 | 本地数据管理 | 游戏状态同步 |
| 网络 | 不参与网络同步 | 参与网络同步 |

## 最佳实践

### 1. 数据管理

【重点】将需要跨关卡的数据放在 GameInstance 中：

- ✅ 玩家进度、存档数据
- ✅ 游戏设置（音效、画质）
- ✅ 全局配置
- ❌ 关卡特定的数据（应放在 GameMode 或 GameState）

### 2. 初始化顺序

【注意】GameInstance 的 `Init()` 在关卡加载之前调用，注意初始化顺序：

```cpp
void UMyGameInstance::Init()
{
    Super::Init();
    
    // 1. 先初始化基础系统
    InitializeCoreSystems();
    
    // 2. 再加载数据
    LoadGameData();
    
    // 3. 最后初始化依赖系统
    InitializeDependentSystems();
}
```

### 3. 内存管理

【技巧】GameInstance 会一直存在，注意避免内存泄漏：

- 及时清理不需要的引用
- 使用弱引用（`TWeakPtr`）避免循环引用
- 在 `Shutdown()` 中清理资源

### 4. 网络游戏注意事项

【注意】在多人游戏中：

- GameInstance 在客户端和服务器上各自独立
- 不要将需要同步的数据放在 GameInstance 中
- 使用 GameState 进行服务器权威的状态管理

## 调试技巧

### 查看 GameInstance

【技巧】在编辑器中查看当前 GameInstance：

- **窗口 -> 世界场景设置 -> 游戏实例**
- 或在代码中使用 `GetGameInstance()` 获取

### 日志输出

```cpp
void UMyGameInstance::Init()
{
    Super::Init();
    
    UE_LOG(LogTemp, Warning, TEXT("GameInstance Initialized"));
}
```

## 相关链接

- [[w/unreal/pawn-controller-gamemode|Pawn-Controller-GameMode]] - GameMode 的详细说明
- [[w/unreal/actor创建与销毁|Actor创建与销毁]] - Actor 的生命周期
- [[w/unreal/gamestate|GameState]] - 游戏状态管理

---

**Next**: [[w/unreal/存档系统|存档系统]]