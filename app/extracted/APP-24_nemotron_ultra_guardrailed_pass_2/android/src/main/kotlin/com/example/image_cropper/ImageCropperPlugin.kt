package com.example.image_cropper

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import androidx.activity.result.contract.ActivityResultContracts
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.common.MethodChannel.MethodCallHandler
import io.flutter.plugin.common.MethodChannel.Result
import java.io.File
import java.io.FileOutputStream

class ImageCropperPlugin : FlutterPlugin, MethodCallHandler {
  private var channel: MethodChannel? = null
  private var activity: Activity? = null

  override fun onAttachedToEngine(binding: FlutterPlugin.FlutterPluginBinding) {
    channel = MethodChannel(binding.binaryMessenger, "com.example.image_cropper/android")
    channel?.setMethodCallHandler(this)
  }

  override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
    channel?.setMethodCallHandler(null)
    channel = null
  }

  override fun onMethodCall(call: MethodCall, result: Result) {
    if (call.method == "cropImage") {
      val sourcePath = call.argument<String>("sourcePath") ?: return result.error("INVALID_ARG", "sourcePath required", null)
      val aspectRatio = call.argument<Double>("aspectRatio")
      val maxWidth = call.argument<Int>("maxWidth")
      val maxHeight = call.argument<Int>("maxHeight")
      val compressFormat = call.argument<String>("compressFormat") ?: "jpeg"
      val compressQuality = call.argument<Int>("compressQuality") ?: 90

      cropImage(sourcePath, aspectRatio, maxWidth, maxHeight, compressFormat, compressQuality, result)
    } else {
      result.notImplemented()
    }
  }

  private fun cropImage(
    sourcePath: String,
    aspectRatio: Double?,
    maxWidth: Int?,
    maxHeight: Int?,
    compressFormat: String,
    compressQuality: Int,
    result: Result
  ) {
    val sourceFile = File(sourcePath)
    if (!sourceFile.exists()) {
      result.error("FILE_NOT_FOUND", "Source file does not exist", null)
      return
    }

    val intent = Intent("com.android.camera.action.CROP")
    intent.setDataAndType(Uri.fromFile(sourceFile), "image/*")
    intent.putExtra("crop", "true")
    intent.putExtra("scale", true)
    intent.putExtra("scaleUpIfNeeded", true)

    aspectRatio?.let { ratio ->
      val (num, den) = ratioToFraction(ratio)
      intent.putExtra("aspectX", num)
      intent.putExtra("aspectY", den)
    }

    maxWidth?.let { intent.putExtra("outputX", it) }
    maxHeight?.let { intent.putExtra("outputY", it) }

    intent.putExtra("return-data", false)
    intent.putExtra(MediaStore.EXTRA_OUTPUT, Uri.fromFile(sourceFile))
    intent.putExtra("outputFormat", compressFormat.uppercase())
    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)

    val launcher = activity?.registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { activityResult ->
      if (activityResult.resultCode == Activity.RESULT_OK) {
        result.success(sourcePath)
      } else {
        result.error("CROP_CANCELLED", "User cancelled crop operation", null)
      }
    }

    launcher?.launch(intent)
  }

  private fun ratioToFraction(ratio: Double): Pair<Int, Int> {
    val tolerance = 1e-6
    var numerator = 1
    var denominator = 1
    var bestNum = 1
    var bestDen = 1
    var bestError = Double.MAX_VALUE

    while (denominator <= 100) {
      numerator = (ratio * denominator).round()
      val error = (numerator.toDouble() / denominator - ratio).absoluteValue
      if (error < bestError) {
        bestError = error
        bestNum = numerator
        bestDen = denominator
        if (error < tolerance) break
      }
      denominator++
    }
    return Pair(bestNum, bestDen)
  }

  fun setActivity(activity: Activity) {
    this.activity = activity
  }
}

---