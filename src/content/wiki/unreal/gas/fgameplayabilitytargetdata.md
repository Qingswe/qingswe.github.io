---
title: FGameplayAbilityTargetData
description: TargetData 在能力激活过程中传递目标选择结果与复制数据。
tags: [Unreal, GAS]
updated: 2025-04-19
---

当我们激活了GameplayTask时，我们可以使用`ServerSetRelicatedTargetData`函数，将目标数据发送到服务器

这里的核心思想是，客户端的rpc和服务端的Activate执行可能会出现不同步的情况，所以我们可以把需要目标触发的相关功能放置到TargetSetDelegate中，这样即使Active时，没有Target，也可以在接收到TargetSet时触发正确的逻辑。
相反，如果是设置Target的RPC先到，也会在Activate时再次广播该委托并检索目标数据
## CallReplicatedTaregtDataDelegateIfSet


[[w/unreal/gas/gameabilitytargettypes|GameAbilityTargetTypes]]

[[w/unreal/gas/predictionkey|PredictionKey]]