package com.example.image_cropper_utility

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import androidx.annotation.NonNull
import androidx.annotation.Nullable
import androidx.core.content.FileProvider
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.common.MethodChannel.MethodCallHandler
import io.flutter.plugin.common.MethodChannel.Result
import io.flutter.plugin.common.PluginRegistry.Registrar
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.io.OutputStream
import java.util.UUID
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class ImageCropperUtilityPlugin: FlutterPlugin, MethodCallHandler {
  private var channel: MethodChannel? = null
  private var activity: Activity? = null
  private var pendingResult: Result? = null
  private var sourceUri: Uri? = null
  private var cropOptions: CropOptions? = null
  private val executor: ExecutorService = Executors.newSingleThreadExecutor()

  override fun onAttachedToEngine(@NonNull flutterPluginBinding: FlutterPlugin.FlutterPluginBinding) {
    channel = MethodChannel(flutterPluginBinding.binaryMessenger, "image_cropper_utility")
    channel?.setMethodCallHandler(this)
  }

  override fun onDetachedFromEngine(@NonNull binding: FlutterPlugin.FlutterPluginBinding) {
    channel?.setMethodCallHandler(null)
    channel = null
    executor.shutdown()
  }

  companion object {
    @JvmStatic
    fun registerWith(registrar: Registrar) {
      val channel = MethodChannel(registrar.messenger(), "image_cropper_utility")
      val plugin = ImageCropperUtilityPlugin()
      plugin.activity = registrar.activity()
      channel.setMethodCallHandler(plugin)
    }
  }

  override fun onMethodCall(@NonNull call: MethodCall, @NonNull result: Result) {
    when (call.method) {
      "cropImage" -> {
        val arguments = call.arguments as Map<String, Any?>
        val sourcePath = arguments["sourcePath"] as String
        val optionsMap = arguments["options"] as? Map<String, Any?> ?? emptyMap()
        
        cropOptions = CropOptions.fromMap(optionsMap)
        pendingResult = result
        
        val sourceFile = File(sourcePath)
        if (!sourceFile.exists()) {
          result.error("FILE_NOT_FOUND", "Source file does not exist: $sourcePath", null)
          return
        }
        
        sourceUri = FileProvider.getUriForFile(
          activity!!,
          "${activity!!.packageName}.fileprovider",
          sourceFile
        )
        
        launchCropActivity()
      }
      else -> result.notImplemented()
    }
  }

  private fun launchCropActivity() {
    val intent = Intent(activity, CropImageActivity::class.java).apply {
      putExtra("source_uri", sourceUri.toString())
      putExtra("crop_options", cropOptions?.toBundle())
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
    }
    
    activity?.startActivityForResult(intent, CROP_REQUEST_CODE, Bundle())
  }

  fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode == CROP_REQUEST_CODE) {
      if (resultCode == Activity.RESULT_OK && data != null) {
        val outputPath = data.getStringExtra("output_path")
        val width = data.getIntExtra("width", 0)
        val height = data.getIntExtra("height", 0)
        val mimeType = data.getStringExtra("mime_type")
        val fileSize = data.getLongExtra("file_size", 0)
        
        val resultMap = mapOf(
          "path" to outputPath,
          "width" to width,
          "height" to height,
          "mimeType" to mimeType,
          "fileSize" to fileSize
        )
        pendingResult?.success(resultMap)
      } else if (resultCode == Activity.RESULT_CANCELED) {
        pendingResult?.success(null)
      } else {
        val error = data?.getStringExtra("error") ?: "Unknown error"
        pendingResult?.error("CROP_FAILED", error, null)
      }
      pendingResult = null
      cropOptions = null
      sourceUri = null
    }
  }

  private companion object {
    const val CROP_REQUEST_CODE = 0xCROP
  }
}

data class CropOptions(
  val aspectRatio: Double? = null,
  val preset: Int? = null,
  val cropStyle: Int = 0,
  val compressImage: Boolean = true,
  val compressQuality: Int = 90,
  val maxWidth: Int? = null,
  val maxHeight: Int? = null,
  val toolbarColor: Int? = null,
  val toolbarWidgetColor: Int? = null,
  val statusBarColor: Int? = null,
  val toolbarTitle: String? = null,
  val showCropGrid: Boolean = true,
  val hideBottomControls: Boolean = false,
  val enableRotation: Boolean = true,
  val enableZoom: Boolean = true,
  val aspectRatioPresets: List<Int>? = null,
  val androidOptions: Map<String, Any?>? = null,
) {
  fun toBundle(): Bundle {
    val bundle = Bundle()
    aspectRatio?.let { bundle.putDouble("aspectRatio", it) }
    preset?.let { bundle.putInt("preset", it) }
    bundle.putInt("cropStyle", cropStyle)
    bundle.putBoolean("compressImage", compressImage)
    bundle.putInt("compressQuality", compressQuality)
    maxWidth?.let { bundle.putInt("maxWidth", it) }
    maxHeight?.let { bundle.putInt("maxHeight", it) }
    toolbarColor?.let { bundle.putInt("toolbarColor", it) }
    toolbarWidgetColor?.let { bundle.putInt("toolbarWidgetColor", it) }
    statusBarColor?.let { bundle.putInt("statusBarColor", it) }
    toolbarTitle?.let { bundle.putString("toolbarTitle", it) }
    bundle.putBoolean("showCropGrid", showCropGrid)
    bundle.putBoolean("hideBottomControls", hideBottomControls)
    bundle.putBoolean("enableRotation", enableRotation)
    bundle.putBoolean("enableZoom", enableZoom)
    aspectRatioPresets?.let { bundle.putIntegerArrayList("aspectRatioPresets", java.util.ArrayList(it)) }
    androidOptions?.forEach { (key, value) ->
      when (value) {
        is String -> bundle.putString(key, value)
        is Int -> bundle.putInt(key, value)
        is Boolean -> bundle.putBoolean(key, value)
        is Double -> bundle.putDouble(key, value)
        is Long -> bundle.putLong(key, value)
      }
    }
    return bundle
  }

  companion object {
    fun fromMap(map: Map<String, Any?>): CropOptions {
      return CropOptions(
        aspectRatio = map["aspectRatio"] as? Double,
        preset = map["preset"] as? Int,
        cropStyle = map["cropStyle"] as? Int ?: 0,
        compressImage = map["compressImage"] as? Boolean ?: true,
        compressQuality = map["compressQuality"] as? Int ?: 90,
        maxWidth = map["maxWidth"] as? Int,
        maxHeight = map["maxHeight"] as? Int,
        toolbarColor = map["toolbarColor"] as? Int,
        toolbarWidgetColor = map["toolbarWidgetColor"] as? Int,
        statusBarColor = map["statusBarColor"] as? Int,
        toolbarTitle = map["toolbarTitle"] as? String,
        showCropGrid = map["showCropGrid"] as? Boolean ?: true,
        hideBottomControls = map["hideBottomControls"] as? Boolean ?: false,
        enableRotation = map["enableRotation"] as? Boolean ?: true,
        enableZoom = map["enableZoom"] as? Boolean ?: true,
        aspectRatioPresets = (map["aspectRatioPresets"] as? List<Any?>)?.map { it as Int }.toList(),
        androidOptions = map["androidOptions"] as? Map<String, Any?>,
      )
    }
  }
}

class CropImageActivity : Activity() {
  private lateinit var cropImageView: CropImageView
  private var sourceUri: Uri? = null
  private var cropOptions: CropOptions? = null
  private var outputFile: File? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    sourceUri = intent.getStringExtra("source_uri")?.let { Uri.parse(it) }
    cropOptions = CropOptions.fromBundle(intent.getBundleExtra("crop_options") ?: Bundle())
    
    if (sourceUri == null) {
      setResult(RESULT_CANCELED, Intent().putExtra("error", "No source URI provided"))
      finish()
      return
    }

    outputFile = createOutputFile()
    if (outputFile == null) {
      setResult(RESULT_CANCELED, Intent().putExtra("error", "Failed to create output file"))
      finish()
      return
    }

    cropImageView = CropImageView(this).apply {
      layoutParams = android.view.ViewGroup.LayoutParams(
        android.view.ViewGroup.LayoutParams.MATCH_PARENT,
        android.view.ViewGroup.LayoutParams.MATCH_PARENT
      )
      setImageUriAsync(sourceUri!!)
    }

    applyCropOptions()
    setContentView(cropImageView)
    setupToolbar()
  }

  private fun applyCropOptions() {
    cropOptions?.let { options ->
      if (options.aspectRatio != null) {
        cropImageView.setFixedAspectRatio(options.aspectRatio!!)
      } else if (options.preset != null) {
        applyPreset(options.preset!!)
      }
      
      cropImageView.setCropShape(if (options.cropStyle == 1) CropImageView.CropShape.OVAL else CropImageView.CropShape.RECTANGLE)
      cropImageView.setGuidelines(options.showCropGrid)
      cropImageView.setAutoZoomEnabled(options.enableZoom)
      cropImageView.setRotateEnabled(options.enableRotation)
    }
  }

  private fun applyPreset(preset: Int) {
    when (preset) {
      1 -> cropImageView.setFixedAspectRatio(1.0) // square
      2 -> cropImageView.setFixedAspectRatio(1.5) // 3x2
      3 -> cropImageView.setFixedAspectRatio(4.0/3.0) // 4x3
      4 -> cropImageView.setFixedAspectRatio(16.0/9.0) // 16x9
      5 -> cropImageView.setFixedAspectRatio(9.0/16.0) // 9x16
      else -> cropImageView.setFixedAspectRatio(false)
    }
  }

  private fun setupToolbar() {
    val toolbar = android.widget.Toolbar(this).apply {
      setBackgroundColor(cropOptions?.toolbarColor ?: 0xFF000000.toInt())
      setTitleTextColor(cropOptions?.toolbarWidgetColor ?: 0xFFFFFFFF.toInt())
      title = cropOptions?.toolbarTitle ?: "Crop Image"
      setNavigationIcon(androidx.appcompat.R.drawable.abc_ic_ab_back_material)
      setNavigationOnClickListener { onBackPressed() }
      inflateMenu(R.menu.crop_menu)
      setOnMenuItemClickListener { item ->
