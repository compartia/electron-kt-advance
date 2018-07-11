var ___test_contract = {
  "globalVariables": [
    {
     "name": "currentPidProfile"
    }
   ],

  "functions": [
    {
      "name": "getMotorDmaOutput",
      "parameters": [
        "index"
      ],
      "postconditions": [
        {
          "math": {
            "apply": {
              "not-null": true,
              "return": true
            }
          }
        }
      ]
    },

    {
      "name": "pidProfiles",
      "parameters": [
        "_index"
      ],
      "postconditions": [
        {
          "math": {
            "apply": {
              "initialized": true,
              "apply": {
                "addressed-value": true,
                "return": true,
                "field": {
                  "fname": "dterm_lpf_hz"
                }
              }
            }
          }
        },
        {
          "math": {
            "apply": {
              "initialized": true,
              "apply": {
                "addressed-value": true,
                "return": true,
                "field": {
                  "fname": "dterm_notch_hz"
                }
              }
            }
          }
        },
        {
          "math": {
            "apply": {
              "initialized": true,
              "apply": {
                "addressed-value": true,
                "return": true,
                "field": {
                  "fname": "dterm_notch_cutoff"
                }
              }
            }
          }
        },
        {
          "math": {
            "apply": {
              "initialized": true,
              "apply": {
                "addressed-value": true,
                "return": true,
                "field": {
                  "fname": "yaw_lpf_hz"
                }
              }
            }
          }
        },
        {
          "math": {
            "apply": {
              "initialized": true,
              "apply": {
                "addressed-value": true,
                "return": true,
                "field": {
                  "fname": "dtermSetpointWeight"
                }
              }
            }
          }
        },
        {
          "math": {
            "apply": {
              "initialized": true,
              "apply": {
                "addressed-value": true,
                "return": true,
                "field": {
                  "fname": "setpointRelaxRatio"
                }
              }
            }
          }
        },
        {
          "math": {
            "apply": {
              "initialized": true,
              "apply": {
                "addressed-value": true,
                "return": true,
                "field": {
                  "fname": "itermAcceleratorGain"
                }
              }
            }
          }
        },
        {
          "math": {
            "apply": {
              "initialized": true,
              "apply": {
                "addressed-value": true,
                "return": true,
                "field": {
                  "fname": "itermThrottleThreshold"
                }
              }
            }
          }
        },
        {
          "math": {
            "apply": {
              "not-null": true,
              "return": true
            }
          }
        }
      ]
    },

    {
      "name": "spiDeviceByInstance",
      "parameters": [
        "instance"
      ],
      "postconditions": [
        {
          "math": {
            "apply": {
              "geq": true,
              "return": true,
              "cn": "0"
            }
          }
        },
        {
          "math": {
            "apply": {
              "lt": true,
              "return": true,
              "cn": "3"
            }
          }
        }
      ]
    }


  ],
  "name": "src/main/drivers/pwm_output_dshot",
  "data-structures": true
}



