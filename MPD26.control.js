/*
Copyright (c) 2016, Egil Hasting
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, 
are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this 
list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, 
this list of conditions and the following disclaimer in the documentation and/or 
other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND 
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED 
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE 
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL 
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER 
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, 
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
// A short controller script for mapping mpd26 to bitwig.  
// K1-K6 is mapped to macro1 - macro6
// Transport controllers is mapped to its equalents in bitwig
//
// TODO: Make a better forward/rewind. Make it response to holding down button.
loadAPI(1);
host.defineController("Akai", "MPD26", "1.0", "9367ce97-9ac6-4e4a-96dc-318cdca19781", "Egil Hasting");
host.defineMidiPorts(1, 1);
host.addDeviceNameBasedDiscoveryPair(
    ["Akai MPD26"], ["Akai MPD26"]);
host.addDeviceNameBasedDiscoveryPair(
    ["Akai MPD26 MIDI 1"], ["Akai MPD26 MIDI 1"]);
var LOWEST_CC = 1;
var HIGHEST_CC = 127;
var transport = undefined;
var cursordevice = undefined;



// START Constants
function Statevalues() {
    var LastValue = 0;
    var Timestamp = Date.now();
};

function Statebank() {}
Statebank.K1 = new Statevalues();
Statebank.K2 = new Statevalues();
Statebank.K3 = new Statevalues();
Statebank.K4 = new Statevalues();
Statebank.K5 = new Statevalues();
Statebank.K6 = new Statevalues();
Statebank.F1 = new Statevalues();
Statebank.F2 = new Statevalues();
Statebank.F3 = new Statevalues();
Statebank.F4 = new Statevalues();
Statebank.F5 = new Statevalues();
Statebank.F6 = new Statevalues();

function MPD26Constants() {}
MPD26Constants.SYSEX_END = "f7";
MPD26Constants.MMC_SYSEXHEADER = "f04700784000021";
MPD26Constants.PLAY_D = MPD26Constants.MMC_SYSEXHEADER + "301f7";
MPD26Constants.PLAY_U = MPD26Constants.MMC_SYSEXHEADER + "300f7";
MPD26Constants.STOP_D = MPD26Constants.MMC_SYSEXHEADER + "201f7";
MPD26Constants.STOP_U = MPD26Constants.MMC_SYSEXHEADER + "200f7";
MPD26Constants.FFW_D = MPD26Constants.MMC_SYSEXHEADER + "101f7";
MPD26Constants.FFW_U = MPD26Constants.MMC_SYSEXHEADER + "100f7";
MPD26Constants.FBW_D = MPD26Constants.MMC_SYSEXHEADER + "001f7";
MPD26Constants.FBW_U = MPD26Constants.MMC_SYSEXHEADER + "000f7";
MPD26Constants.REC_D = MPD26Constants.MMC_SYSEXHEADER + "401f7";
MPD26Constants.REC_U = MPD26Constants.MMC_SYSEXHEADER + "400f7";
MPD26Constants.CC_SYSEXHEADER = "f04700784100020";
MPD26Constants.K1 = MPD26Constants.CC_SYSEXHEADER + "0";
MPD26Constants.K2 = MPD26Constants.CC_SYSEXHEADER + "1";
MPD26Constants.K3 = MPD26Constants.CC_SYSEXHEADER + "2";
MPD26Constants.K4 = MPD26Constants.CC_SYSEXHEADER + "3";
MPD26Constants.K5 = MPD26Constants.CC_SYSEXHEADER + "4";
MPD26Constants.K6 = MPD26Constants.CC_SYSEXHEADER + "5";
MPD26Constants.F1 = MPD26Constants.CC_SYSEXHEADER + "6";
MPD26Constants.F2 = MPD26Constants.CC_SYSEXHEADER + "7";
MPD26Constants.F3 = MPD26Constants.CC_SYSEXHEADER + "8";
MPD26Constants.F4 = MPD26Constants.CC_SYSEXHEADER + "9";
MPD26Constants.F5 = MPD26Constants.CC_SYSEXHEADER + "a";
MPD26Constants.F6 = MPD26Constants.CC_SYSEXHEADER + "b";
// END Constants


function generateStepValue(deviceTimestamp) {
    var now = Date.now();
    var dt = now - deviceTimestamp;
    if (dt < 11) {
        return 4;
    } else {
        return 1;
    }
}

function controlmacro(macroid, controllerobject, valuedec) {
    stepvalue = generateStepValue(controllerobject.Timestamp);
    if (controllerobject.LastValue >= valuedec) {
        for (i = 0; i < stepvalue; i++) {
            cursordevice.getMacro(macroid).getAmount().inc(-1, 128);
        }
    } else {
        for (i = 0; i < stepvalue; i++) {
            cursordevice.getMacro(macroid).getAmount().inc(1, 128);
        }
    }
    controllerobject.LastValue = valuedec;
    controllerobject.Timestamp = Date.now();
}

function onSysex(data) {
    // Used for detectiD MMC
    switch (data) {
        // Push buttons
        case MPD26Constants.PLAY_D:
            transport.play();
            break;
        case MPD26Constants.STOP_D:
            transport.stop();
            break;
        case MPD26Constants.FFW_D:
            transport.fastForward();
            break;
        case MPD26Constants.FBW_D:
            transport.rewind();
            break;
        case MPD26Constants.REC_D:
            transport.record();
            break;
        default:
            // f047007841000204 -> this part goes: 14f7
            var controllerid = data.substring(0, 16);
            var valuehex = data.substring(16, 18);
            var valuedec = parseInt(valuehex, 16);
            //println("controller: " + controllerid + " Value: " +valuehex + "(" + valuedec + ")");
            //getMacro(1);
            switch (controllerid) {
                case MPD26Constants.K1:
                    controlmacro(0, Statebank.K1, valuedec);
                    break;
                case MPD26Constants.K2:
                    controlmacro(1, Statebank.K2, valuedec);
                    break;
                case MPD26Constants.K3:
                    controlmacro(2, Statebank.K3, valuedec);
                    break;
                case MPD26Constants.K4:
                    controlmacro(3, Statebank.K4, valuedec);
                    break;
                case MPD26Constants.K5:
                    controlmacro(4, Statebank.K5, valuedec);
                    break;
                case MPD26Constants.K6:
                    controlmacro(5, Statebank.K6, valuedec);
                    break;
                default:
                    break;
            }
            // Ignore
    }
}

function onMidi(status, data1, data2) {
    //println(status + " " + data1 + " " + data2);
    if (isChannelController(status)) {
        if (data1 >= LOWEST_CC && data1 <= HIGHEST_CC) {
            var index = data1 - LOWEST_CC;
            userControls.getControl(index).set(data2, 128);
        }
    }
}


// START MAIN
function init() {
    transport = host.createTransport();
    cursordevice = host.createCursorDevice();
    var AKAI = host.getMidiInPort(0).createNoteInput("Pads", "??????");
    host.getMidiInPort(0).setMidiCallback(onMidi);
    host.getMidiInPort(0).setSysexCallback(onSysex);
    //host.getMidiInPort(0).setSysexCallback(DSysex);
    host.getMidiOutPort(0).setShouldSendMidiBeatClock(true);
    AKAI.setShouldConsumeEvents(false);
    // Make CCs 2-119 freely mappable
    userControls = host.createUserControlsSection(HIGHEST_CC - LOWEST_CC + 1);
    for (var i = LOWEST_CC; i <= HIGHEST_CC; i++) {
        userControls.getControl(i - LOWEST_CC).setLabel("CC" + i);
    }
}

function exit() {
    // Nothing to do here... :-)
}
// END MAIN