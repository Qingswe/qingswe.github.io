---
title: FInterpTo
description: FInterpTo 用于按速度平滑逼近目标值。
tags: [Unreal, C++]
updated: 2025-04-24
---

1. FInterpTo 概述
  
FInterpTo 是虚幻引擎提供的一个数学插值函数，全名是 FMath::InterpTo，用于在两个浮点值（float）之间进行平滑插值。它常用于实现平滑过渡效果，例如物体的平滑移动、旋转、缩放、属性渐变等。它的核心特点是基于固定速度的插值，适合需要稳定、平滑变化的场景。
  
原理
•  FInterpTo 基于线性插值（Lerp）的思想，但它以恒定速度（Constant Speed）进行插值，而不是像普通 Lerp 那样基于固定比例。
•  它会根据当前值、目标值、帧间隔时间（DeltaTime）和插值速度（InterpSpeed）计算出新的值，确保过渡平滑且速度可控。
•  公式简化为：
  `
  NewValue = CurrentValue + (TargetValue - CurrentValue) * InterpSpeed * DeltaTime
  `
  其中，InterpSpeed 控制过渡的快慢，DeltaTime 确保插值与帧率无关。
  
与 Unity 的对比
•  Unity 类似功能：Unity 中没有直接的 FInterpTo 等价函数，但开发者通常使用 Mathf.Lerp 或 Vector3.Lerp 配合自定义逻辑实现类似效果。Unity 的 Mathf.MoveTowards 是更接近 FInterpTo 的函数，它以固定向目标值移动。
•  差异：
  ◦  Unity 的 Mathf.Lerp 是基于比例的插值（需要手动计算插值因子 t），而 FInterpTo 是基于速度的插值，简化了平滑过渡的实现。
  ◦  Unity 需要开发者手动处理 Time.deltaTime 来实现帧率无关的插值，而 FInterpTo 已内置对 DeltaTime 的支持。
  ◦  FInterpTo 是虚幻引擎数学库的一部分，天然集成到蓝图和 C++ 中，调用更简洁。
  
---
  
2. FInterpTo 的使用方法
  
FInterpTo 通常在以下场景中使用：
•  平滑移动物体（如位置、旋转、缩放）。
•  调整属性值（如透明度、音量、灯光强度）。
•  实现相机平滑跟随、UI 动画等。
  
函数签名
float FMath::InterpTo(float Current, float Target, float DeltaTime, float InterpSpeed);
•  参数：
  ◦  Current：当前值（浮点数）。
  ◦  Target：目标值（浮点数）。
  ◦  DeltaTime：帧间隔时间（通常从 Tick 事件获取）。
  ◦  InterpSpeed：插值速度，值越大，过渡越快（通常取 1.0 到 10.0）。
•  返回值：插值后的新值。
  
蓝图中的 FInterpTo
在蓝图中，FInterpTo 是一个节点，位于 Math > Float 分类下，名称为 “FInterp To”。
  
---
  
3. 示例：蓝图实现平滑移动
  
假设我们希望一个物体从当前位置平滑移动到目标位置（类似于 Unity 的 Vector3.Lerp 效果）。
  
蓝图实现
4. 创建变量：
  ◦  创建一个 Vector 类型的变量 TargetLocation，表示目标位置。
  ◦  创建一个 float 类型的变量 InterpSpeed，默认设为 5.0。
  
5. 蓝图逻辑：
  ◦  在 Tick Event（每帧更新）中：
    ▪︎  获取物体的当前位置（Get Actor Location）。
    ▪︎  对位置的 X、Y、Z 分量分别使用 FInterp To 进行插值。
    ▪︎  使用插值后的值更新物体的位置（Set Actor Location）。
  
   蓝图示例：
  ◦  拖入 Tick Event 节点。
  ◦  从 Tick Event 的 Delta Seconds 引出 DeltaTime。
  ◦  获取 TargetLocation 和当前 Actor Location。
  ◦  使用 Break Vector 拆分当前和目标位置的 X、Y、Z 分量。
  ◦  对每个分量调用 FInterp To，传入：
    ▪︎  当前值（Current）：当前 X/Y/Z。
    ▪︎  目标值（Target）：目标 X/Y/Z。
    ▪︎  DeltaTime：从 Tick 获取。
    ▪︎  InterpSpeed：从变量获取。
  ◦  使用 Make Vector 将插值后的 X、Y、Z 重新组合。
  ◦  调用 Set Actor Location 更新位置。
  
   蓝图节点图示（文字描述）：
   `
   Tick Event -> Delta Seconds -> FInterp To (X, Y, Z) -> Make Vector -> Set Actor Location
   `
  
6. 测试：
  ◦  在场景中设置 TargetLocation（例如通过蓝图或关卡中的另一个 Actor）。
  ◦  运行游戏，物体将平滑移动到目标位置。
  
与 Unity 的对比
•  Unity 实现：
  在 Unity 中，你可能这样写：
```cs
  public Transform target;
  public float speed = 5f;
  
  void Update()
  {
      Vector3 currentPos = transform.position;
      Vector3 targetPos = target.position;
      float step = speed * Time.deltaTime;
      transform.position = Vector3.MoveTowards(currentPos, targetPos, step);
  }
```
  ◦  优点：MoveTowards 简单直观。
  ◦  缺点：需要手动处理 Time.deltaTime，逻辑分散在脚本中。
  
•  虚幻蓝图优势：
  ◦  FInterp To 节点内置了对 DeltaTime 的支持，逻辑更集中。
  ◦  蓝图的视觉化编程减少了代码编写，适合快速迭代。
  ◦  虚幻的 Tick Event 和蓝图系统更适合非程序员快速搭建逻辑。
  
---
  
4. 示例：C++ 实现平滑移动
  
如果你更倾向于用 C++ 实现，以下是一个完整的例子。
  
C++ 代码
```cpp
#include "GameFramework/Actor.h"
#include "MyActor.h"

AMyActor::AMyActor()
{
    PrimaryActorTick.bCanEverTick = true; // 启用 Tick
    InterpSpeed = 5.0f;
}

void AMyActor::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);

    // 获取当前和目标位置
    FVector CurrentLocation = GetActorLocation();
    FVector TargetLocation = /* 你的目标位置，例如某个 Actor 的位置 */;

    // 对 X、Y、Z 分量进行插值
    float NewX = FMath::InterpTo(CurrentLocation.X, TargetLocation.X, DeltaTime, InterpSpeed);
    float NewY = FMath::InterpTo(CurrentLocation.Y, TargetLocation.Y, DeltaTime, InterpSpeed);
    float NewZ = FMath::InterpTo(CurrentLocation.Z, TargetLocation.Z, DeltaTime, InterpSpeed);

    // 更新位置
    SetActorLocation(FVector(NewX, NewY, NewZ));
}
```
头文件
```cpp
#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "MyActor.generated.h"

UCLASS()
class YOURPROJECT_API AMyActor : public AActor
{
    GENERATED_BODY()

public:
    AMyActor();

    virtual void Tick(float DeltaTime) override;

    UPROPERTY(EditAnywhere, Category = "Movement")
    float InterpSpeed;
};
```
与 Unity 的对比
•  Unity C#：Unity 的 C# 脚本通常更轻量，