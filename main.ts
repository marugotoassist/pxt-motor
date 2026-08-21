/*！
 * @file pxt-motor/main.ts
 * @brief DFRobot's microbit motor drive makecode library.
 * @n [Get the module here](http://www.dfrobot.com.cn/goods-1577.html)
 * @n This is the microbit special motor drive library, which realizes control 
 *    of the eight-channel steering gear, two-step motor and four-way dc motor.
 *
 * @copyright	[DFRobot](http://www.dfrobot.com), 2016
 * @copyright	GNU Lesser General Public License
 *
 * @author [email](1035868977@qq.com)
 * @version  V1.0.1
 * @date  2018-03-20
 */

/**
 *This is DFRobot:motor user motor and steering control function.
 */
//% weight=10 color=#DF6721 icon="\uf013" block="DF-Driver"
namespace motor {
    const PCA9685_ADDRESS = 0x40
    const MODE1 = 0x00
    const MODE2 = 0x01
    const SUBADR1 = 0x02
    const SUBADR2 = 0x03
    const SUBADR3 = 0x04
    const PRESCALE = 0xFE
    const LED0_ON_L = 0x06
    const LED0_ON_H = 0x07
    const LED0_OFF_L = 0x08
    const LED0_OFF_H = 0x09
    const ALL_LED_ON_L = 0xFA
    const ALL_LED_ON_H = 0xFB
    const ALL_LED_OFF_L = 0xFC
    const ALL_LED_OFF_H = 0xFD

    const STP_CHA_L = 2047
    const STP_CHA_H = 4095

    const STP_CHB_L = 1
    const STP_CHB_H = 2047

    const STP_CHC_L = 1023
    const STP_CHC_H = 3071

    const STP_CHD_L = 3071
    const STP_CHD_H = 1023


    const BYG_CHA_L = 3071
    const BYG_CHA_H = 1023

    const BYG_CHB_L = 1023
    const BYG_CHB_H = 3071

    const BYG_CHC_L = 4095
    const BYG_CHC_H = 2047

    const BYG_CHD_L = 2047
    const BYG_CHD_H = 4095

    /**
     * The user can choose the step motor model.
     */
    export enum Stepper {
        //% block="42"
        Ste1 = 1,
        //% block="28"
        Ste2 = 2
    }

    /**
     * The user can select the 8 steering gear controller.
     */
    export enum Servos {
        S1 = 0x08,
        S2 = 0x07,
        S3 = 0x06,
        S4 = 0x05,
        S5 = 0x04,
        S6 = 0x03,
        S7 = 0x02,
        S8 = 0x01
    }

    /**
     * The user selects the 4-way dc motor.
     */
    export enum Motors {
        M1 = 0x1,
        M2 = 0x2,
        M3 = 0x3,
        M4 = 0x4
    }

    /**
     * The user defines the motor rotation direction.
     */
    export enum Dir {
        //% blockId="CW" block="CW"
        CW = 1,
        //% blockId="CCW" block="CCW"
        CCW = -1,
    }

    /**
     * The user can select a two-path stepper motor controller.
     */
    export enum Steppers {
        M1_M2 = 0x1,
        M3_M4 = 0x2
    }



    let initialized = false
    // PWM frequency (Hz) used for PCA9685. Default 50Hz (servo compatible).
    // PCA9685 supports about 24Hz ~ 1526Hz (25MHz internal oscillator).
    const PWM_FREQ_MIN = 24
    const PWM_FREQ_MAX = 1526
    let pwmFrequency = 50
    // Kick start (startup boost): when a motor starts from stop (or reverses),
    // drive it at kickDuty (0~255) for kickMs before applying the target speed.
    // Disabled when kickMs == 0.
    let kickDuty = 0
    let kickMs = 0
    // Dead-band compensation: remap speed 1~255 to minSpeed~255. 0 = disabled.
    let minSpeed = 0
    // Last signed speed (0~255 scale, sign = direction) per motor M1~M4 (index 1..4).
    let lastSpeed = [0, 0, 0, 0, 0]

    function i2cWrite(addr: number, reg: number, value: number) {
        let buf = pins.createBuffer(2)
        buf[0] = reg
        buf[1] = value
        pins.i2cWriteBuffer(addr, buf)
    }

    function i2cCmd(addr: number, value: number) {
        let buf = pins.createBuffer(1)
        buf[0] = value
        pins.i2cWriteBuffer(addr, buf)
    }

    function i2cRead(addr: number, reg: number) {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        let val = pins.i2cReadNumber(addr, NumberFormat.UInt8BE);
        return val;
    }

    function initPCA9685(): void {
        i2cWrite(PCA9685_ADDRESS, MODE1, 0x00)
        setFreq(pwmFrequency);
        initialized = true
    }

    function setFreq(freq: number): void {
        // Constrain the frequency
        let prescaleval = 25000000;
        prescaleval /= 4096;
        prescaleval /= freq;
        prescaleval -= 1;
        let prescale = Math.floor(prescaleval + 0.5);
        if (prescale < 3) prescale = 3;       // PCA9685 hardware minimum (about 1526Hz)
        if (prescale > 255) prescale = 255;   // PCA9685 hardware maximum (about 24Hz)
        let oldmode = i2cRead(PCA9685_ADDRESS, MODE1);
        let newmode = (oldmode & 0x7F) | 0x10; // sleep
        i2cWrite(PCA9685_ADDRESS, MODE1, newmode); // go to sleep
        i2cWrite(PCA9685_ADDRESS, PRESCALE, prescale); // set the prescaler
        i2cWrite(PCA9685_ADDRESS, MODE1, oldmode);
        control.waitMicros(5000);
        i2cWrite(PCA9685_ADDRESS, MODE1, oldmode | 0xa1);
    }

    function setPwm(channel: number, on: number, off: number): void {
        if (channel < 0 || channel > 15)
            return;

        let buf = pins.createBuffer(5);
        buf[0] = LED0_ON_L + 4 * channel;
        buf[1] = on & 0xff;
        buf[2] = (on >> 8) & 0xff;
        buf[3] = off & 0xff;
        buf[4] = (off >> 8) & 0xff;
        pins.i2cWriteBuffer(PCA9685_ADDRESS, buf);
    }


    function setStepper_28(index: number, dir: boolean): void {
        if (index == 1) {
            if (dir) {
                setPwm(4, STP_CHA_L, STP_CHA_H);
                setPwm(6, STP_CHB_L, STP_CHB_H);
                setPwm(5, STP_CHC_L, STP_CHC_H);
                setPwm(7, STP_CHD_L, STP_CHD_H);
            } else {
                setPwm(7, STP_CHA_L, STP_CHA_H);
                setPwm(5, STP_CHB_L, STP_CHB_H);
                setPwm(6, STP_CHC_L, STP_CHC_H);
                setPwm(4, STP_CHD_L, STP_CHD_H);
            }
        } else {
            if (dir) {
                setPwm(0, STP_CHA_L, STP_CHA_H);
                setPwm(2, STP_CHB_L, STP_CHB_H);
                setPwm(1, STP_CHC_L, STP_CHC_H);
                setPwm(3, STP_CHD_L, STP_CHD_H);
            } else {
                setPwm(3, STP_CHA_L, STP_CHA_H);
                setPwm(1, STP_CHB_L, STP_CHB_H);
                setPwm(2, STP_CHC_L, STP_CHC_H);
                setPwm(0, STP_CHD_L, STP_CHD_H);
            }
        }
    }


    function setStepper_42(index: number, dir: boolean): void {
        if (index == 1) {
            if (dir) {
                setPwm(7, BYG_CHA_L, BYG_CHA_H);
                setPwm(6, BYG_CHB_L, BYG_CHB_H);
                setPwm(5, BYG_CHC_L, BYG_CHC_H);
                setPwm(4, BYG_CHD_L, BYG_CHD_H);
            } else {
                setPwm(7, BYG_CHC_L, BYG_CHC_H);
                setPwm(6, BYG_CHD_L, BYG_CHD_H);
                setPwm(5, BYG_CHA_L, BYG_CHA_H);
                setPwm(4, BYG_CHB_L, BYG_CHB_H);
            }
        } else {
            if (dir) {
                setPwm(3, BYG_CHA_L, BYG_CHA_H);
                setPwm(2, BYG_CHB_L, BYG_CHB_H);
                setPwm(1, BYG_CHC_L, BYG_CHC_H);
                setPwm(0, BYG_CHD_L, BYG_CHD_H);
            } else {
                setPwm(3, BYG_CHC_L, BYG_CHC_H);
                setPwm(2, BYG_CHD_L, BYG_CHD_H);
                setPwm(1, BYG_CHA_L, BYG_CHA_H);
                setPwm(0, BYG_CHB_L, BYG_CHB_H);
            }
        }
    }


    /**
     * Set the PWM frequency of the PCA9685 (applies to all motors and servos).
     * 24Hz ~ 1526Hz. Default 50Hz. Servos require 50Hz.
    */
    //% weight=95
    //% blockId=motor_setPwmFrequency block="Set PWM frequency|%frequency|Hz"
    //% frequency.min=24 frequency.max=1526 frequency.defl=50
    export function setPwmFrequency(frequency: number): void {
        if (frequency < PWM_FREQ_MIN) frequency = PWM_FREQ_MIN
        if (frequency > PWM_FREQ_MAX) frequency = PWM_FREQ_MAX
        pwmFrequency = frequency
        if (!initialized) {
            initPCA9685()
        } else {
            setFreq(pwmFrequency)
        }
    }

    /**
     * Get the current PWM frequency (Hz).
    */
    //% weight=94
    //% blockId=motor_getPwmFrequency block="PWM frequency (Hz)"
    export function getPwmFrequency(): number {
        return pwmFrequency
    }

    /**
     * Set kick start (startup boost). When a motor starts from stop or reverses,
     * it is driven at "duty" (0~255) for "ms" milliseconds before the target speed is applied.
     * Set ms to 0 to disable. Only applies when the target speed is lower than duty.
    */
    //% weight=93
    //% blockId=motor_setKickStart block="Set kick start|duty|%duty|time (ms)|%ms"
    //% duty.min=0 duty.max=255 duty.defl=200
    //% ms.min=0 ms.max=1000 ms.defl=100
    export function setKickStart(duty: number, ms: number): void {
        if (duty < 0) duty = 0
        if (duty > 255) duty = 255
        if (ms < 0) ms = 0
        kickDuty = duty
        kickMs = ms
    }

    /**
     * Set minimum effective speed (dead-band compensation).
     * speed 1~255 is remapped linearly to min~255 so that low speed values still move the motor.
     * Set to 0 to disable. Measure the lowest speed that keeps the motor turning and use that.
    */
    //% weight=92
    //% blockId=motor_setMinSpeed block="Set minimum speed|%min"
    //% min.min=0 min.max=254 min.defl=0
    export function setMinSpeed(min: number): void {
        if (min < 0) min = 0
        if (min > 254) min = 254
        minSpeed = min
    }

    function applyMinSpeed(speed: number): number {
        if (minSpeed <= 0 || speed <= 0) return speed
        if (speed > 255) speed = 255
        return Math.round(minSpeed + (255 - minSpeed) * (speed - 1) / 254)
    }

    function computeTarget(direction: number, speed: number): number {
        let sign = direction > 0 ? 1 : -1
        if (speed < 0) { // keep upstream behaviour: negative speed flips direction
            speed = -speed
            sign = -sign
        }
        if (speed > 255) speed = 255
        return applyMinSpeed(speed) * sign // signed, -255..255
    }

    function needsKick(index: number, target: number): boolean {
        // Kick start: starting from stop, or reversing direction, with a target weaker than the kick.
        let prev = lastSpeed[index]
        let fromStop = (prev == 0) || (prev > 0 && target < 0) || (prev < 0 && target > 0)
        return kickMs > 0 && target != 0 && fromStop && Math.abs(target) < kickDuty
    }

    function writeMotor(index: number, signedSpeed: number): void {
        // signedSpeed: -255..255
        let v = signedSpeed * 16 // map 255 to 4096
        if (v >= 4096) v = 4095
        if (v <= -4096) v = -4095
        let pn = (4 - index) * 2
        let pp = (4 - index) * 2 + 1
        if (v >= 0) {
            setPwm(pp, 0, v)
            setPwm(pn, 0, 0)
        } else {
            setPwm(pp, 0, 0)
            setPwm(pn, 0, -v)
        }
    }

    /**
	 * Steering gear control function.
     * S1~S8.
     * 0°~180°.
	*/
    //% blockId=motor_servo block="Servo|%index|degree|%degree"
    //% weight=100
    //% degree.min=0 degree.max=180
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=4
    export function servo(index: Servos, degree: number): void {
        if (!initialized) {
            initPCA9685()
        }
        // 50hz
        let v_us = (degree * 1800 / 180 + 600) // 0.6ms ~ 2.4ms
        let value = v_us * 4096 / 20000
        setPwm(index + 7, 0, value)
    }

    /**
	 * Execute a motor
     * M1~M4.
     * speed(0~255).
    */
    //% weight=90
    //% blockId=motor_MotorRun block="Motor|%index|dir|%Dir|speed|%speed"
    //% speed.min=0 speed.max=255
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=2
    //% direction.fieldEditor="gridpicker" direction.fieldOptions.columns=2
    export function MotorRun(index: Motors, direction: Dir, speed: number): void {
        if (!initialized) {
            initPCA9685()
        }
        if (index > 4 || index <= 0)
            return
        let target = computeTarget(direction, speed)
        if (needsKick(index, target)) {
            writeMotor(index, target > 0 ? kickDuty : -kickDuty)
            basic.pause(kickMs)
        }
        writeMotor(index, target)
        lastSpeed[index] = target
    }

    /**
	 * Execute two motors at the same time. The kick start (if enabled) is applied to
     * both motors simultaneously, so a differential drive robot starts straight.
     * Use this instead of two Motor blocks for left/right wheels.
    */
    //% weight=89
    //% blockId=motor_motorRunDual block="Motor|%index1|dir|%direction1|speed|%speed1|and Motor|%index2|dir|%direction2|speed|%speed2"
    //% inlineInputMode=inline
    //% speed1.min=0 speed1.max=255
    //% speed2.min=0 speed2.max=255
    //% index2.defl=Motors.M2
    //% index1.fieldEditor="gridpicker" index1.fieldOptions.columns=2
    //% direction1.fieldEditor="gridpicker" direction1.fieldOptions.columns=2
    //% index2.fieldEditor="gridpicker" index2.fieldOptions.columns=2
    //% direction2.fieldEditor="gridpicker" direction2.fieldOptions.columns=2
    export function MotorRunDual(index1: Motors, direction1: Dir, speed1: number, index2: Motors, direction2: Dir, speed2: number): void {
        if (!initialized) {
            initPCA9685()
        }
        if (index1 > 4 || index1 <= 0 || index2 > 4 || index2 <= 0)
            return
        if (index1 == index2) {
            MotorRun(index1, direction1, speed1)
            return
        }
        let t1 = computeTarget(direction1, speed1)
        let t2 = computeTarget(direction2, speed2)
        let k1 = needsKick(index1, t1)
        let k2 = needsKick(index2, t2)
        if (k1 || k2) {
            // Kick both motors in the same period: kicked ones get kickDuty,
            // the other one gets its target right away.
            writeMotor(index1, k1 ? (t1 > 0 ? kickDuty : -kickDuty) : t1)
            writeMotor(index2, k2 ? (t2 > 0 ? kickDuty : -kickDuty) : t2)
            basic.pause(kickMs)
        }
        writeMotor(index1, t1)
        writeMotor(index2, t2)
        lastSpeed[index1] = t1
        lastSpeed[index2] = t2
    }

    /**
	 * Execute a 42BYGH1861A-C step motor(Degree).
     * M1_M2/M3_M4.
    */
    //% weight=80
    //% blockId=motor_stepperDegree_42 block="Stepper 42|%index|dir|%direction|degree|%degree"
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=2
    //% direction.fieldEditor="gridpicker" direction.fieldOptions.columns=2
    export function stepperDegree_42(index: Steppers, direction: Dir, degree: number): void {
        if (!initialized) {
            initPCA9685()
        }
        // let Degree = Math.abs(degree);
        // Degree = Degree * direction;
        //setFreq(100);
        setStepper_42(index, direction > 0);
        if (degree == 0) {
            return;
        }
        let Degree = Math.abs(degree);
        basic.pause((50000 * Degree) / (360 * 100));  //100hz
        if (index == 1) {
            motorStop(1)
            motorStop(2)
        } else {
            motorStop(3)
            motorStop(4)
        }
        //setFreq(50);
    }

    /**
	 * Execute a 42BYGH1861A-C step motor(Turn).
     * M1_M2/M3_M4.
    */
    //% weight=70
    //% blockId=motor_stepperTurn_42 block="Stepper 42|%index|dir|%direction|turn|%turn"
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=2
    //% direction.fieldEditor="gridpicker" direction.fieldOptions.columns=2
    export function stepperTurn_42(index: Steppers, direction: Dir, turn: number): void {
        if (turn == 0) {
            return;
        }
        let degree = turn * 360;
        stepperDegree_42(index, direction, degree);
    }

    /**
	 * Execute a 28BYJ-48 step motor(Degree).
     * M1_M2/M3_M4.
    */
    //% weight=60
    //% blockId=motor_stepperDegree_28 block="Stepper 28|%index|dir|%direction|degree|%degree"
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=2
    //% direction.fieldEditor="gridpicker" direction.fieldOptions.columns=2
    export function stepperDegree_28(index: Steppers, direction: Dir, degree: number): void {
        if (!initialized) {
            initPCA9685()
        }
        if (degree == 0) {
            return;
        }
        let Degree = Math.abs(degree);
        Degree = Degree * direction;
        //setFreq(100);
        setStepper_28(index, Degree > 0);
        Degree = Math.abs(Degree);
        basic.pause((1000 * Degree) / 360);
        if (index == 1) {
            motorStop(1)
            motorStop(2)
        } else {
            motorStop(3)
            motorStop(4)
        }
        //setFreq(50);
    }

    /**
	 * Execute a 28BYJ-48 step motor(Turn).
     * M1_M2/M3_M4.
    */
    //% weight=50
    //% blockId=motor_stepperTurn_28 block="Stepper 28|%index|dir|%direction|turn|%turn"
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=2
    //% direction.fieldEditor="gridpicker" direction.fieldOptions.columns=2
    export function stepperTurn_28(index: Steppers, direction: Dir, turn: number): void {
        if (turn == 0) {
            return;
        }
        let degree = turn * 360;
        stepperDegree_28(index, direction, degree);
    }

    /**
	 * Two parallel stepper motors are executed simultaneously(DegreeDual).
    */
    //% weight=40
    //% blockId=motor_stepperDegreeDual_42 block="Dual Stepper %stepper|M1_M2 dir %direction1|degree %degree1|M3_M4 dir %direction2|degree %degree2"
    //% stepper.fieldEditor="gridpicker" stepper.fieldOptions.columns=2
    //% direction1.fieldEditor="gridpicker" direction1.fieldOptions.columns=2
    //% direction2.fieldEditor="gridpicker" direction2.fieldOptions.columns=2
    export function stepperDegreeDual_42(stepper: Stepper, direction1: Dir, degree1: number, direction2: Dir, degree2: number): void {
        if (!initialized) {
            initPCA9685()
        }
        let timeout1 = 0;
        let timeout2 = 0;
        let Degree1 = Math.abs(degree1);
        let Degree2 = Math.abs(degree2);

        if (stepper == 1) {  // 42 stepper
            if (Degree1 == 0 && Degree2 == 0) {
                setStepper_42(0x01, direction1 > 0);
                setStepper_42(0x02, direction2 > 0);
            } else if ((Degree1 == 0) && (Degree2 > 0)) {
                timeout1 = (50000 * Degree2) / (360 * 100)
                setStepper_42(0x01, direction1 > 0);
                setStepper_42(0x02, direction2 > 0);
                basic.pause(timeout1);
                motorStop(3); motorStop(4);
            } else if ((Degree2 == 0) && (Degree1 > 0)) {
                timeout1 = (50000 * Degree1) / (360 * 100)
                setStepper_42(0x01, direction1 > 0);
                setStepper_42(0x02, direction2 > 0);
                basic.pause(timeout1);
                motorStop(1); motorStop(2);
            } else if ((Degree2 > Degree1)) {
                timeout1 = (50000 * Degree1) / (360 * 100)
                timeout2 = (50000 * (Degree2 - Degree1)) / (360 * 100)
                setStepper_42(0x01, direction1 > 0);
                setStepper_42(0x02, direction2 > 0);
                basic.pause(timeout1);
                motorStop(1); motorStop(2);
                basic.pause(timeout2);
                motorStop(3); motorStop(4);
            } else if ((Degree2 < Degree1)) {
                timeout1 = (50000 * Degree2) / (360 * 100)
                timeout2 = (50000 * (Degree1 - Degree2)) / (360 * 100)
                setStepper_42(0x01, direction1 > 0);
                setStepper_42(0x02, direction2 > 0);
                basic.pause(timeout1);
                motorStop(3); motorStop(4);
                basic.pause(timeout2);
                motorStop(1); motorStop(2);
            }
        } else if (stepper == 2) {
            if (Degree1 == 0 && Degree2 == 0) {
                setStepper_28(0x01, direction1 > 0);
                setStepper_28(0x02, direction2 > 0);
            } else if ((Degree1 == 0) && (Degree2 > 0)) {
                timeout1 = (50000 * Degree2) / (360 * 100)
                setStepper_28(0x01, direction1 > 0);
                setStepper_28(0x02, direction2 > 0);
                basic.pause(timeout1);
                motorStop(3); motorStop(4);
            } else if ((Degree2 == 0) && (Degree1 > 0)) {
                timeout1 = (50000 * Degree1) / (360 * 100)
                setStepper_28(0x01, direction1 > 0);
                setStepper_28(0x02, direction2 > 0);
                basic.pause(timeout1);
                motorStop(1); motorStop(2);
            } else if ((Degree2 > Degree1)) {
                timeout1 = (50000 * Degree1) / (360 * 100)
                timeout2 = (50000 * (Degree2 - Degree1)) / (360 * 100)
                setStepper_28(0x01, direction1 > 0);
                setStepper_28(0x02, direction2 > 0);
                basic.pause(timeout1);
                motorStop(1); motorStop(2);
                basic.pause(timeout2);
                motorStop(3); motorStop(4);
            } else if ((Degree2 < Degree1)) {
                timeout1 = (50000 * Degree2) / (360 * 100)
                timeout2 = (50000 * (Degree1 - Degree2)) / (360 * 100)
                setStepper_28(0x01, direction1 > 0);
                setStepper_28(0x02, direction2 > 0);
                basic.pause(timeout1);
                motorStop(3); motorStop(4);
                basic.pause(timeout2);
                motorStop(1); motorStop(2);
            }
        } else {
            //
        }
    }

    /**
	 * Two parallel stepper motors are executed simultaneously(Turn).
    */
    //% weight=30
    //% blockId=motor_stepperTurnDual_42 block="Dual Stepper %stepper|M1_M2 dir %direction1|trun %trun1|M3_M4 dir %direction2|trun %trun2"
    //% stepper.fieldEditor="gridpicker" stepper.fieldOptions.columns=2
    //% direction1.fieldEditor="gridpicker" direction1.fieldOptions.columns=2
    //% direction2.fieldEditor="gridpicker" direction2.fieldOptions.columns=2
    export function stepperTurnDual_42(stepper: Stepper, direction1: Dir, trun1: number, direction2: Dir, trun2: number): void {
        if ((trun1 == 0) && (trun2 == 0)) {
            return;
        }
        let degree1 = trun1 * 360;
        let degree2 = trun2 * 360;

        if (stepper == 1) {
            stepperDegreeDual_42(stepper, direction1, degree1, direction2, degree2);
        } else if (stepper == 2) {
            stepperDegreeDual_42(stepper, direction1, degree1, direction2, degree2);
        } else {

        }

    }

    /**
	 * Stop the dc motor.
    */
    //% weight=20
    //% blockId=motor_motorStop block="Motor stop|%index"
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=2 
    export function motorStop(index: Motors) {
        setPwm((4 - index) * 2, 0, 0);
        setPwm((4 - index) * 2 + 1, 0, 0);
        if (index >= 1 && index <= 4) lastSpeed[index] = 0
    }

    /**
	 * Stop all motors
    */
    //% weight=10
    //% blockId=motor_motorStopAll block="Motor Stop All"
    export function motorStopAll(): void {
        for (let idx = 1; idx <= 4; idx++) {
            motorStop(idx);
        }
    }
}

