---
title: 12 URP 屏幕后处理效果 [URP]
published: 2024-07-16
description: '如果是位于 Unity 6 中自己写后处理，Unity6 中采用了新的 RenderGraph System'
tags: [Shader, Unity, 图形学, URP]
category: Shader入门精要
draft: false
---

如果是位于 Unity 6 中自己写后处理，Unity6 中采用了新的 RenderGraph System

‣ 

里面包括了如何 写入纹理 和 输出纹理 进行操作

[Use a texture in a render pass | Universal RP | 17.0.3 (unity3d.com)](https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0/manual/render-graph-read-write-texture.html?q=setrenderattachment)

现在的后处理由三部分组成

- RenderFeature
- VolumeComponent
- RenderPass
### VolumeComponent

其中只是用于 配置在 Volume组件中 对应的数值

```csharp
[Serializable]
public class CustomVolumeComponent:VolumeComponent
{
    public BoolParameter isActive = new BoolParameter(true);
    public ClampedFloatParameter horizontalBlur =
        new ClampedFloatParameter(0.05f, 0, 0.5f);
    public ClampedFloatParameter verticalBlur =
        new ClampedFloatParameter(0.05f, 0, 0.5f);
}

```

### RenderFeature

可以说是封装在Render Pass 上层用来和引擎做交互的，包括了整个效果的生命周期，需要额外实现Create 等，以便进行Pass的绘制，还需要设置Pass 的属性和 准备和Pass 交互的绘制数据

```csharp
using UnityEngine;
using UnityEngine.Rendering.Universal;
using System;
using UnityEditor;

public class BlurRenderFexature : ScriptableRendererFeature
{

    [SerializeField] private BlurSettings settings;
    [SerializeField] private Shader shader;
    private Material material;
    private BlurRenderPass _blurRenderPass;
    
    public override void Create()
    {
        if(shader == null)
        {
            return;
        }

        material = new Material(shader);
        _blurRenderPass = new BlurRenderPass(settings,material);

        _blurRenderPass.renderPassEvent = RenderPassEvent.AfterRenderingPostProcessing;
    }

    public override void AddRenderPasses(ScriptableRenderer renderer, ref RenderingData renderingData)
    {
        if (renderingData.cameraData.cameraType == CameraType.Game)
        {
            renderer.EnqueuePass(_blurRenderPass);
        }
    }

    protected override void Dispose(bool disposing)
    {
        // base.Dispose(disposing);
        #if UNITY_EDITOR
        if (EditorApplication.isPlaying)
        {
            Destroy(material);
        }
        else
        {
            DestroyImmediate(material);
        }
        
        #else
        Destroy(material);
        #endif
    }
}
[Serializable]
public class BlurSettings
{
    [Range(0,0.4f)] public float horizontalBlur;
    [Range(0,0.4f)] public float verticalBlur;
}
```

### RenderPass

核心部分，用来接收 来自摄像机的 Color 数据，然后经过 Shader重新绘制以后，传回摄像机，以完成整个Pass的绘制

注意在实现 `RecordRenderGraph` 的时候需要删掉 base的实现，不然会算作未完成

```csharp
using UnityEngine.Rendering;
using UnityEngine.Rendering.RenderGraphModule;
using UnityEngine.Rendering.Universal;
using UnityEngine;
public class BlurRenderPass : ScriptableRenderPass
{
    private static readonly int horizontalBlurId = Shader.PropertyToID("_HorizontalBlur");
    private static readonly int verticalBlurId = Shader.PropertyToID("_VerticalBlur");
    private const string k_BlurTextureName = "_BlurTexture";
    private const string k_VerticalPassName = "VerticalBlurRenderPass";
    private const string k_HorizontalPassName = "HorizontalBlurRenderPass";

    private BlurSettings defaultSettings;
    private Material material;
    private RenderTextureDescriptor blurTextureDescriptor;

    // TODO 不知道
    private static Vector4 m_ScaleBias = new Vector4(1f, 1f, 0f, 0f);
    
    private class PassData
    {
        internal TextureHandle src;
        internal Material material;
    }

    private void UpdateBlurSettings()
    {
        if (material == null) return;

        // 获取VolumeComponent中的数据去设置Material
        var volumeComponent = VolumeManager.instance.stack.GetComponent<CustomVolumeComponent>();
        float horizontalBlur = volumeComponent.horizontalBlur.overrideState
            ? volumeComponent.horizontalBlur.value
            : defaultSettings.horizontalBlur;
        float verticalBlur = volumeComponent.verticalBlur.overrideState
            ? volumeComponent.verticalBlur.value
            : defaultSettings.verticalBlur;
        material.SetFloat(horizontalBlurId, horizontalBlur);
        material.SetFloat(verticalBlurId, verticalBlur);
    }

    private static void ExecutePass(PassData data, RasterGraphContext context, int passIndex)
    {
        Blitter.BlitTexture(context.cmd, data.src, m_ScaleBias, data.material, passIndex);
    }

    public BlurRenderPass(BlurSettings settings, Material material)
    {
        this.defaultSettings = settings;
        this.material = material;

        blurTextureDescriptor =
            new RenderTextureDescriptor(Screen.width, Screen.height, RenderTextureFormat.Default, 0);
    }

    public override void RecordRenderGraph(RenderGraph renderGraph, ContextContainer frameData)
    {
        // 创建存储UniversalResourceData数据的引用，该数据中包含了渲染管线的所有资源，包括 当前帧颜色和深度纹理
        UniversalResourceData resourceData = frameData.Get<UniversalResourceData>();
        UniversalCameraData cameraData = frameData.Get<UniversalCameraData>();

        // The following line ensures that the render pass doesn't blit
        // from the back buffer.
        if (resourceData.isActiveTargetBackBuffer)
            return;

        blurTextureDescriptor.width = cameraData.cameraTargetDescriptor.width;
        blurTextureDescriptor.height = cameraData.cameraTargetDescriptor.height;
        blurTextureDescriptor.depthBufferBits = 0;

        TextureHandle srcCamColor = resourceData.activeColorTexture;
        TextureHandle dst =
            UniversalRenderer.CreateRenderGraphTexture(renderGraph, blurTextureDescriptor, k_BlurTextureName, false);

        // 更新Material中的pass数据
        UpdateBlurSettings();

        // This check is to avoid an error from the material preview in the scene
        // 避免material在 Scene 中预览错误的检查
        if (!srcCamColor.IsValid() || !dst.IsValid())
            return;

        // vertical pass
        using (var builder = renderGraph.AddRasterRenderPass<PassData>(k_VerticalPassName, out var passData))
        {
            // 定义 pass 数据
            passData.src = srcCamColor;
            passData.material = material;

            // 定义 render graph 的输入输出, 默认是读取
            builder.UseTexture(passData.src);
            // 设置图像作为 RenderTarget, 将纹理设置为只写
            // Set the texture as the render target
            // The second parameter is the index the shader uses to access the texture
            builder.SetRenderAttachment(dst, 0);

            // 相机颜色输出到 render graph texture
            builder.SetRenderFunc((PassData passData, RasterGraphContext context) => ExecutePass(passData, context, 0));
        }

        // horizontal pass
        using (var builder = renderGraph.AddRasterRenderPass<PassData>(k_HorizontalPassName, out var passData))
        {
            // 定义 pass 数据
            passData.src = dst;
            passData.material = material;

            // 使用 上一个 pass 的输出作为输入
            builder.UseTexture(passData.src);
            // 使用上一个 pass 的输出作为输出
            builder.SetRenderAttachment(srcCamColor, 0);

            // 相机颜色输出到 render graph texture
            builder.SetRenderFunc((PassData passData, RasterGraphContext context) => ExecutePass(passData, context, 1));
        }
        // base.RecordRenderGraph(renderGraph, frameData);
    }
}
```

#### Add relevant files