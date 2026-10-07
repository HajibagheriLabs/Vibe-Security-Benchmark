package com.example.image_cropper

import android.app.Activity
import io.flutter.embedding.engine.plugins.activity.ActivityAware
import io.flutter.embedding.engine.plugins.activity.ActivityPluginBinding

class ImageCropperPluginBinding : ActivityAware {
  private var plugin: ImageCropperPlugin? = null

  override fun onAttachedToActivityBinding(binding: ActivityPluginBinding) {
    plugin = ImageCropperPlugin()
    plugin?.setActivity(binding.activity)
    binding.addActivityResultListener(plugin!!)
  }

  override fun onDetachedFromActivityBinding() {
    plugin = null
  }

  override fun onDetachedFromActivityForConfigChanges() {
    onDetachedFromActivityBinding()
  }

  override fun onReattachedToActivityForConfigChanges(binding: ActivityPluginBinding) {
    onAttachedToActivityBinding(binding)
  }
}

---