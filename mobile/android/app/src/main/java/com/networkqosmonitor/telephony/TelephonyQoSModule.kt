package com.networkqosmonitor.telephony

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.*
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class TelephonyQoSModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var telephonyManager: TelephonyManager? = null
    private var isMonitoring = false
    private var phoneStateListener: PhoneStateListener? = null
    private var telephonyCallback: Any? = null

    init {
        telephonyManager = reactContext.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
    }

    override fun getName(): String {
        return "TelephonyQoS"
    }

    @ReactMethod
    fun getNetworkTelephonyInfo(promise: Promise) {
        try {
            val tm = telephonyManager
            if (tm == null) {
                promise.reject("UNAVAILABLE", "TelephonyManager not available on this device")
                return
            }

            val result = Arguments.createMap()

            // Carrier / Operator Info
            val networkOperatorName = tm.networkOperatorName.ifEmpty { "Desconocido" }
            val simOperatorName = tm.simOperatorName.ifEmpty { networkOperatorName }
            val networkOperator = tm.networkOperator // MCC + MNC
            var mcc = ""
            var mnc = ""
            if (networkOperator != null && networkOperator.length >= 5) {
                mcc = networkOperator.substring(0, 3)
                mnc = networkOperator.substring(3)
            }

            result.putString("operatorName", networkOperatorName)
            result.putString("simOperatorName", simOperatorName)
            result.putString("mcc", mcc)
            result.putString("mnc", mnc)
            result.putBoolean("isRoaming", tm.isNetworkRoaming)
            result.putInt("simState", tm.simState)

            // Cellular Generation and Technology
            val netTypeInt = if (ContextCompat.checkSelfPermission(
                    reactContext,
                    Manifest.permission.READ_PHONE_STATE
                ) == PackageManager.PERMISSION_GRANTED
            ) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    tm.dataNetworkType
                } else {
                    @Suppress("DEPRECATION")
                    tm.networkType
                }
            } else {
                TelephonyManager.NETWORK_TYPE_UNKNOWN
            }

            val (gen, typeName) = getNetworkTypeDetails(netTypeInt)
            result.putString("generation", gen)
            result.putString("networkType", typeName)

            // Signal Metrics from CellInfo
            var signalDbm = -999
            var signalLevel = 0
            var rsrp = -999
            var rsrq = -999
            var sinr = -999

            if (ContextCompat.checkSelfPermission(
                    reactContext,
                    Manifest.permission.ACCESS_FINE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED
            ) {
                val cellInfos = tm.allCellInfo
                if (cellInfos != null) {
                    for (info in cellInfos) {
                        if (info.isRegistered) {
                            when (info) {
                                is CellInfoLte -> {
                                    val lteSignal = info.cellSignalStrength
                                    signalDbm = lteSignal.dbm
                                    signalLevel = lteSignal.level
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                        rsrp = lteSignal.rsrp
                                        rsrq = lteSignal.rsrq
                                        sinr = lteSignal.rssnr
                                    }
                                }
                                is CellInfoNr -> {
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                        val nrSignal = info.cellSignalStrength as? CellSignalStrengthNr
                                        if (nrSignal != null) {
                                            signalDbm = nrSignal.dbm
                                            signalLevel = nrSignal.level
                                            rsrp = nrSignal.csiRsrp
                                            rsrq = nrSignal.csiRsrq
                                            sinr = nrSignal.csiSinr
                                        }
                                    }
                                }
                                is CellInfoWcdma -> {
                                    val wcdmaSignal = info.cellSignalStrength
                                    signalDbm = wcdmaSignal.dbm
                                    signalLevel = wcdmaSignal.level
                                }
                                is CellInfoGsm -> {
                                    val gsmSignal = info.cellSignalStrength
                                    signalDbm = gsmSignal.dbm
                                    signalLevel = gsmSignal.level
                                }
                            }
                            break
                        }
                    }
                }
            }

            // Signal Strength fallback (if cell info was unavailable or returned default)
            if (signalDbm == -999 || signalDbm == Int.MAX_VALUE) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    val ss = tm.signalStrength
                    if (ss != null) {
                        signalLevel = ss.level
                        // Estimating dBm based on standard Android level (0..4)
                        signalDbm = when (signalLevel) {
                            4 -> -75
                            3 -> -85
                            2 -> -95
                            1 -> -105
                            else -> -115
                        }
                    }
                }
            }

            result.putInt("signalDbm", if (signalDbm == Int.MAX_VALUE) -110 else signalDbm)
            result.putInt("signalLevel", signalLevel) // 0-4
            result.putInt("rsrp", if (rsrp == Int.MAX_VALUE) -999 else rsrp)
            result.putInt("rsrq", if (rsrq == Int.MAX_VALUE) -999 else rsrq)
            result.putInt("sinr", if (sinr == Int.MAX_VALUE) -999 else sinr)

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("TELEPHONY_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun startSignalMonitoring(promise: Promise) {
        val tm = telephonyManager
        if (tm == null) {
            promise.reject("UNAVAILABLE", "TelephonyManager not available")
            return
        }

        if (isMonitoring) {
            promise.resolve(true)
            return
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val executor = reactContext.mainExecutor
                val callback = object : TelephonyCallback(), TelephonyCallback.SignalStrengthsListener {
                    override fun onSignalStrengthsChanged(signalStrength: SignalStrength) {
                        emitSignalUpdate(signalStrength)
                    }
                }
                tm.registerTelephonyCallback(executor, callback)
                telephonyCallback = callback
            } else {
                @Suppress("DEPRECATION")
                val listener = object : PhoneStateListener() {
                    @Deprecated("Deprecated in Java")
                    override fun onSignalStrengthsChanged(signalStrength: SignalStrength?) {
                        super.onSignalStrengthsChanged(signalStrength)
                        if (signalStrength != null) {
                            emitSignalUpdate(signalStrength)
                        }
                    }
                }
                @Suppress("DEPRECATION")
                tm.listen(listener, PhoneStateListener.LISTEN_SIGNAL_STRENGTHS)
                phoneStateListener = listener
            }

            isMonitoring = true
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("MONITOR_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopSignalMonitoring(promise: Promise) {
        val tm = telephonyManager
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && telephonyCallback != null) {
                tm?.unregisterTelephonyCallback(telephonyCallback as TelephonyCallback)
                telephonyCallback = null
            } else if (phoneStateListener != null) {
                @Suppress("DEPRECATION")
                tm?.listen(phoneStateListener, PhoneStateListener.LISTEN_NONE)
                phoneStateListener = null
            }
            isMonitoring = false
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun checkPermissions(promise: Promise) {
        val fineLocation = ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        val phoneState = ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.READ_PHONE_STATE
        ) == PackageManager.PERMISSION_GRANTED

        val map = Arguments.createMap()
        map.putBoolean("locationGranted", fineLocation)
        map.putBoolean("phoneStateGranted", phoneState)
        promise.resolve(map)
    }

    private fun emitSignalUpdate(signalStrength: SignalStrength) {
        if (!reactContext.hasActiveReactInstance()) return

        val params = Arguments.createMap()
        val level = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            signalStrength.level
        } else {
            0
        }
        params.putInt("signalLevel", level)

        val dbm = when (level) {
            4 -> -75
            3 -> -85
            2 -> -95
            1 -> -105
            else -> -115
        }
        params.putInt("signalDbm", dbm)

        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onSignalStrengthChanged", params)
    }

    private fun getNetworkTypeDetails(type: Int): Pair<String, String> {
        return when (type) {
            TelephonyManager.NETWORK_TYPE_GPRS -> Pair("2G", "GPRS")
            TelephonyManager.NETWORK_TYPE_EDGE -> Pair("2G", "EDGE")
            TelephonyManager.NETWORK_TYPE_CDMA -> Pair("2G", "CDMA (IS-95)")
            TelephonyManager.NETWORK_TYPE_1xRTT -> Pair("2G", "1xRTT")
            TelephonyManager.NETWORK_TYPE_IDEN -> Pair("2G", "iDEN")
            TelephonyManager.NETWORK_TYPE_GSM -> Pair("2G", "GSM")

            TelephonyManager.NETWORK_TYPE_UMTS -> Pair("3G", "UMTS")
            TelephonyManager.NETWORK_TYPE_EVDO_0 -> Pair("3G", "EVDO Rev. 0")
            TelephonyManager.NETWORK_TYPE_EVDO_A -> Pair("3G", "EVDO Rev. A")
            TelephonyManager.NETWORK_TYPE_HSDPA -> Pair("3G", "HSDPA")
            TelephonyManager.NETWORK_TYPE_HSUPA -> Pair("3G", "HSUPA")
            TelephonyManager.NETWORK_TYPE_HSPA -> Pair("3G", "HSPA")
            TelephonyManager.NETWORK_TYPE_EVDO_B -> Pair("3G", "EVDO Rev. B")
            TelephonyManager.NETWORK_TYPE_EHRPD -> Pair("3G", "eHRPD")
            TelephonyManager.NETWORK_TYPE_HSPAP -> Pair("3G", "HSPA+")

            TelephonyManager.NETWORK_TYPE_LTE -> Pair("4G", "LTE")
            TelephonyManager.NETWORK_TYPE_IWLAN -> Pair("WiFi", "IWLAN")
            19 -> Pair("4G", "LTE-CA")

            TelephonyManager.NETWORK_TYPE_NR -> Pair("5G", "5G NR")

            else -> Pair("Desconocido", "Desconocido")
        }
    }
}
