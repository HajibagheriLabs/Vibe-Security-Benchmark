-keepclassmembers class com.example.deeplink.WebViewActivity$WebAppInterface {
    public *;
}

-keepclassmembers class * implements android.webkit.WebViewClient {
    public *;
}

-keepclassmembers class * implements android.webkit.WebChromeClient {
    public *;
}

-keep class android.webkit.JavascriptInterface { *; }

-dontwarn android.webkit.**