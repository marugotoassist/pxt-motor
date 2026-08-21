# DF-Driver

Micro:bit motor drive expansion board.
---------------------------------------------------------

## Table of Contents

* [URL](#url)
* [Summary](#summary)
* [Blocks](#blocks)
* [License](#license)

## URL
project URL:  ```https://github.com/DFRobot/pxt-motor```

## Summary
Micro: bit motor driven expansion board is not only expanded the motor drive, in the integration of this extended board four motor driven, 2 road, on the basis of stepper motor driver, also raises the additional 8 road steering gear interface, IO port, 2 road 9 I2C interface.
The motor adopts the interface mode of large current, and the steering machine, I2C and IO port all use Gravity standard interface to support a large number of modules and sensors.
The expansion board USES 3.5v ~ 5.5v power supply, 3.5mm plug and wiring two power interface modes.It has the characteristics of wide range of voltage adaption, large number of ports, compact size, plug and play, convenience and so on.

## Blocks
### 1.Servo
![image](https://github.com/DFRobot/pxt-motor/blob/master/image/1.png)

### 2.DC Motor
![image](https://github.com/DFRobot/pxt-motor/blob/master/image/7.png)

### 3.Stepper-28
![image](https://github.com/DFRobot/pxt-motor/blob/master/image/10.png)<br>
![image](https://github.com/DFRobot/pxt-motor/blob/master/image/2.png)

### 4.Stepper-42
![image](https://github.com/DFRobot/pxt-motor/blob/master/image/8.png)<br>
![image](https://github.com/DFRobot/pxt-motor/blob/master/image/3.png)

### 5.Dual Stepper
![image](https://github.com/DFRobot/pxt-motor/blob/master/image/5.png)<br>
![image](https://github.com/DFRobot/pxt-motor/blob/master/image/9.png)

### 6.Stop the motor
![image](https://github.com/DFRobot/pxt-motor/blob/master/image/6.png)

### 7.Stop all motors
![image](https://github.com/DFRobot/pxt-motor/blob/master/image/4.png)

### 8.Set PWM frequency (marugotoassist fork addition)
`Set PWM frequency %frequency Hz` / `PWM周波数を設定 %frequency Hz`

Sets the PCA9685 PWM frequency used for all motor and servo channels.
Range 24Hz ~ 1526Hz (PCA9685 hardware limit), default 50Hz (same as upstream).
Call it in `on start` before driving motors. Higher frequencies (e.g. 1526Hz)
smooth out low-speed DC motor operation, but **RC servos require 50Hz** and will
not work correctly at other frequencies.

### 9.Kick start / minimum speed (marugotoassist fork addition)
`Set kick start duty %duty time (ms) %ms` / `起動ブーストを設定 デューティ %duty 時間 (ms) %ms`

When a DC motor starts from stop (or reverses), drive it at `duty` (0~255) for `ms`
milliseconds before applying the target speed, so low target speeds can overcome static
friction. Only applies when the target speed is lower than `duty`. `ms = 0` disables (default).
Note: `Motor` block pauses for `ms` while kicking.

`Set minimum speed %min` / `最低速度を設定 %min`

Dead-band compensation: speed 1~255 is remapped linearly to `min`~255. Measure the lowest
speed that keeps your motor turning and set it here. `0` disables (default).

### 10.Dual motor run (marugotoassist fork addition)
`Motor %index1 dir %direction1 speed %speed1 and Motor %index2 dir %direction2 speed %speed2`

Runs two motors in one block. When kick start is enabled, both motors are kicked in the
**same** period (a single wait), so a differential drive robot starts straight instead of
veering — two separate `Motor` blocks kick sequentially and the second wheel starts one
kick-time later. Use this for left/right wheels.


## License

GNU

## Supported targets

* for PXT/microbit
(The metadata above is needed for package search.)
```package
motor=github:marugotoassist/pxt-motor
```
