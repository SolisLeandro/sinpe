const { withDangerousMod, withAndroidManifest } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SMSSenderModuleContent = `
package com.smleandro.Sinpe

import android.Manifest
import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.provider.Telephony
import android.telephony.SmsManager
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume

private const val TAG = "SMSSenderModule"
private const val PERMISSION_REQUEST = 123

class SMSSenderModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private var activeReceiver: BroadcastReceiver? = null
    private var wasReceiverRegistered = false

    override fun getName(): String {
        return "SMSSender"
    }

    private fun normalizePhoneNumber(phoneNumber: String): String {
        // Eliminar todos los caracteres no numéricos excepto +
        var normalized = phoneNumber.replace("[^0-9+]".toRegex(), "")
        
        // Si el número no empieza con + y tiene 8 dígitos, asumimos que es un número de Costa Rica
        if (!normalized.startsWith("+") && normalized.length == 8) {
            normalized = "+506$normalized"
        }
        
        // Si empieza con 506 pero no con +506, añadimos el +
        if (normalized.startsWith("506") && !normalized.startsWith("+")) {
            normalized = "+$normalized"
        }
        
        Log.d(TAG, "Número original: $phoneNumber, Normalizado: $normalized")
        return normalized
    }

    private fun numbersMatch(number1: String?, number2: String?): Boolean {
        if (number1 == null || number2 == null) return false
        
        val norm1 = normalizePhoneNumber(number1)
        val norm2 = normalizePhoneNumber(number2)
        
        // Eliminar el + para la comparación final
        val clean1 = norm1.replace("+", "")
        val clean2 = norm2.replace("+", "")
        
        Log.d(TAG, "Comparando números limpios: $clean1 con $clean2")
        
        return clean1 == clean2 || 
               clean1.endsWith(clean2) || 
               clean2.endsWith(clean1)
    }

    private fun checkPermissions(): Boolean {
        val permissions = arrayOf(
            Manifest.permission.SEND_SMS,
            Manifest.permission.RECEIVE_SMS,
            Manifest.permission.READ_SMS
        )

        return permissions.all {
            ContextCompat.checkSelfPermission(reactContext, it) == PackageManager.PERMISSION_GRANTED
        }
    }

    private fun requestPermissions() {
        val activity = reactContext.currentActivity
        if (activity != null) {
            ActivityCompat.requestPermissions(
                activity,
                arrayOf(
                    Manifest.permission.SEND_SMS,
                    Manifest.permission.RECEIVE_SMS,
                    Manifest.permission.READ_SMS
                ),
                PERMISSION_REQUEST
            )
        }
    }

    @ReactMethod
    fun sendSMSAndWaitForResponse(phoneNumber: String, message: String, promise: Promise) {
        Log.d(TAG, "Iniciando envío de SMS a $phoneNumber")
        
        if (!checkPermissions()) {
            Log.e(TAG, "Permisos no otorgados")
            requestPermissions()
            promise.reject("PERMISSION_ERROR", "Se requieren permisos de SMS")
            return
        }

        unregisterActiveReceiver()

        GlobalScope.launch(Dispatchers.Main) {
            try {
                val response = sendSMSAndWaitForResponseInternal(phoneNumber, message)
                Log.d(TAG, "Respuesta recibida: $response")
                promise.resolve(response)
            } catch (e: Exception) {
                Log.e(TAG, "Error en sendSMSAndWaitForResponse", e)
                promise.reject("ERROR", e.message ?: "Unknown error occurred")
            }
        }
    }

    private fun unregisterActiveReceiver() {
        if (wasReceiverRegistered) {
            try {
                activeReceiver?.let {
                    reactContext.unregisterReceiver(it)
                    Log.d(TAG, "Receiver desregistrado exitosamente")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error al desregistrar receiver", e)
            }
            wasReceiverRegistered = false
            activeReceiver = null
        }
    }

    private suspend fun sendSMSAndWaitForResponseInternal(phoneNumber: String, message: String): String {
        return withContext(Dispatchers.IO) {
            suspendCancellableCoroutine { continuation ->
                try {
                    val normalizedPhone = normalizePhoneNumber(phoneNumber)
                    Log.d(TAG, "Número normalizado para envío: $normalizedPhone")
                    
                    val receiver = object : BroadcastReceiver() {
                        override fun onReceive(context: Context?, intent: Intent?) {
                            Log.d(TAG, "Mensaje SMS recibido")
                            if (intent?.action == Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
                                val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
                                for (sms in messages) {
                                    val senderNumber = sms.originatingAddress
                                    Log.d(TAG, "SMS recibido de: $senderNumber")

                                    if (numbersMatch(senderNumber, normalizedPhone)) {
                                        Log.d(TAG, "Coincidencia encontrada - Mensaje: " + sms.messageBody)
                                        unregisterActiveReceiver()
                                        continuation.resume(sms.messageBody)
                                        break
                                    } else {
                                        Log.d(TAG, "No coincide con el número esperado: " + normalizedPhone)
                                    }
                                }
                            }
                        }
                    }

                    val intentFilter = IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION)
                    intentFilter.priority = IntentFilter.SYSTEM_HIGH_PRIORITY
                    
                    try {
                        reactContext.registerReceiver(
                            receiver,
                            intentFilter,
                            Context.RECEIVER_EXPORTED
                        )
                        wasReceiverRegistered = true
                        activeReceiver = receiver
                        Log.d(TAG, "Receiver registrado exitosamente")
                    } catch (e: Exception) {
                        Log.e(TAG, "Error al registrar receiver", e)
                        throw e
                    }

                    try {
                        val smsManager = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                            reactContext.getSystemService(SmsManager::class.java)
                        } else {
                            @Suppress("DEPRECATION")
                            SmsManager.getDefault()
                        }

                        smsManager.sendTextMessage(
                            normalizedPhone,
                            null,
                            message,
                            null,
                            null
                        )
                        Log.d(TAG, "SMS enviado exitosamente")
                    } catch (e: Exception) {
                        Log.e(TAG, "Error al enviar SMS", e)
                        throw e
                    }

                    continuation.invokeOnCancellation {
                        Log.d(TAG, "Cancelando operación SMS")
                        unregisterActiveReceiver()
                    }

                } catch (e: Exception) {
                    Log.e(TAG, "Error en sendSMSAndWaitForResponseInternal", e)
                    unregisterActiveReceiver()
                    continuation.cancel(e)
                }
            }
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        unregisterActiveReceiver()
    }
}
`;

const SMSSenderPackageContent = `
package com.smleandro.Sinpe

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class SMSSenderPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(SMSSenderModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
`;

function addSMSPermissions(androidManifest) {
  const { manifest } = androidManifest;

  if (!manifest['uses-permission']) {
    manifest['uses-permission'] = [];
  }

  const permissions = [
    'android.permission.SEND_SMS',
    'android.permission.READ_SMS',
    'android.permission.RECEIVE_SMS',
    'android.permission.READ_PHONE_STATE'
  ];

  permissions.forEach(permission => {
    if (!manifest['uses-permission'].some(p => p.$['android:name'] === permission)) {
      manifest['uses-permission'].push({
        $: {
          'android:name': permission,
        },
      });
    }
  });

  return androidManifest;
}

const withSMSSender = config => {
  config = withAndroidManifest(config, config => {
    config.modResults = addSMSPermissions(config.modResults);
    return config;
  });

  return withDangerousMod(config, [
    'android',
    async (config) => {
      const packageName = config.android.package;
      const javaPath = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'java');
      const packagePath = path.join(javaPath, ...packageName.split('.'));

      // Crear SMSSenderModule.kt
      const moduleFullPath = path.join(packagePath, 'SMSSenderModule.kt');
      fs.mkdirSync(path.dirname(moduleFullPath), { recursive: true });
      let moduleContent = SMSSenderModuleContent.replace(/com\.smleandro\.Sinpe/g, packageName);
      fs.writeFileSync(moduleFullPath, moduleContent);
      console.log(`Created SMSSenderModule.kt at ${moduleFullPath}`);

      // Crear SMSSenderPackage.kt
      const packageFullPath = path.join(packagePath, 'SMSSenderPackage.kt');
      let packageContent = SMSSenderPackageContent.replace(/com\.smleandro\.Sinpe/g, packageName);
      fs.writeFileSync(packageFullPath, packageContent);
      console.log(`Created SMSSenderPackage.kt at ${packageFullPath}`);

      // Modificar MainApplication.kt
      const mainApplicationPath = path.join(packagePath, 'MainApplication.kt');
      if (fs.existsSync(mainApplicationPath)) {
        let mainApplicationContent = fs.readFileSync(mainApplicationPath, 'utf8');

        // Añadir import si no existe
        const importStatement = `import ${packageName}.SMSSenderPackage`;
        if (!mainApplicationContent.includes(importStatement)) {
          const lines = mainApplicationContent.split('\n');
          let packageLineIndex = -1;

          // Find the package line
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().startsWith('package ')) {
              packageLineIndex = i;
              break;
            }
          }

          if (packageLineIndex !== -1) {
            // Insert the import after the package line
            lines.splice(packageLineIndex + 1, 0, '', importStatement);
            mainApplicationContent = lines.join('\n');
          } else {
            // If no package line is found, add to the beginning (this should be rare)
            mainApplicationContent = importStatement + '\n' + mainApplicationContent;
          }
        }

        // Modificar la función getPackages()
        const packagesRegex = /override\s+fun\s+getPackages\(\):\s*List<ReactPackage>\s*{[\s\S]*?}/;
        const updatedPackagesContent = `override fun getPackages(): List<ReactPackage> {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // packages.add(new MyReactNativePackage());
          val packages = PackageList(this).packages
          packages.add(SMSSenderPackage())
          return packages
        }`;

        mainApplicationContent = mainApplicationContent.replace(packagesRegex, updatedPackagesContent);


        fs.writeFileSync(mainApplicationPath, mainApplicationContent);
        console.log(`Updated MainApplication.kt at ${mainApplicationPath}`);
      } else {
        console.warn(`MainApplication.kt not found at ${mainApplicationPath}`);
      }

      return config;
    },
  ]);
};

module.exports = withSMSSender;