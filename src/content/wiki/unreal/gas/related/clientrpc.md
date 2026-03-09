---
title: Client RPC
description: Client RPC 用于由服务器触发、在拥有客户端执行的远程调用。
tags: [Unreal, Network]
updated: 2025-04-29
---

# Client RPC

![[w/unreal/2025-04-16-1.png|2025-04-16-1.png]]

【重点】`Client RPC` 的调用方向是：**服务器发起，在某个 Actor 的拥有客户端上执行**。它不是“给所有客户端广播”，而是“发给这个 Actor 所属连接”的单播 RPC。

```cpp title=创建客户端RPC方法
UFUNCTION(Client,Reliable)  
void ShowDamageNumber(float DamageAmount);
```

## 它适合做什么

Client RPC 最常见的用途是给“拥有者本人”发送即时反馈，例如：

- 只让自己看到的 UI 提示
- 技能确认、错误提示、准星反馈
- 角色自身的伤害飘字、命中确认、局部音效

【例子】如果伤害数字只希望攻击者自己看到，而不是所有玩家都看到，就很适合走 Client RPC。

## 调用限制

【重点】Client RPC 只能由服务器正确地下发到拥有连接的客户端。

这意味着：

- 客户端自己调用 Client RPC，不会变成“发给服务器”
- 如果 Actor 没有明确的 owning connection，就无法把调用定向给你想要的那个玩家

【注意】因此这类 RPC 通常放在：

- `PlayerController`
- `Character`
- `PlayerState`

这些拥有关系比较明确的对象上。

## 和 Server RPC / NetMulticast 的区别

- **Client RPC**：服务器 -> 拥有该 Actor 的单个客户端
- **Server RPC**：客户端 -> 服务器，请求服务器执行
- **NetMulticast RPC**：服务器 -> 所有相关客户端，适合全员都要看到的表现

【技巧】判断该用哪一种，可以先问自己一句：这条消息到底是要给“服务器”、“某一个玩家”，还是“所有人”。

## 在 GAS 语境里的常见用法

GAS 里很多状态本身会通过复制和 GameplayCue 同步，但仍然有一些反馈更适合 Client RPC：

- 只给主人看的本地 HUD 提示
- 技能释放失败原因
- 与 UI 强绑定、但没有必要广播给旁观者的效果

【注意】Client RPC 更适合发“瞬时通知”，而不是替代权威状态同步。真正会影响玩法判定的内容，仍应由服务器状态、属性复制或 GameplayEffect 负责。

## 常见坑

- 【注意】不要把“所有人都该看到的表现”写成 Client RPC，否则只有拥有者能收到。
- 【注意】Client RPC 不等于可靠同步状态。持久状态仍应依赖复制变量或 GAS 自带复制。
- 【技巧】如果调用只和某个玩家自己的 UI 相关，优先考虑 Client RPC，而不是 `NetMulticast`。