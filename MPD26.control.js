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
// Using the default "Live" - preset which is located on preset slot 1
// K1-K6 is mapped to macro1 - macro6
// Transport controllers is mapped to its equalents in bitwig
//
// TODO: Make a better forward/rewind. Make it response to holding down button.
var DEBUG = true;

// Wrapped print to be able to toggle on/off debug
function p(text)
{
    if (DEBUG)
    {
        println(text);
    }
}

loadAPI(1);
host.defineController("Akai", "MPD26", "1.0", "9367ce97-9ac6-4e4a-96dc-318cdca19781", "Egil Hasting");
host.defineMidiPorts(1, 1);
host.addDeviceNameBasedDiscoveryPair(
    ["Akai MPD26"], ["Akai MPD26"]);
host.addDeviceNameBasedDiscoveryPair(
    ["MIDIIN2 (Akai MPD26)"], ["MIDIOUT2 (Akai MPD26)"]);

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
MPD26Constants.SYSEX_MMC_HEADER = "f07f7f06";
MPD26Constants.SYSEX_END ="f7";
MPD26Constants.PLAY_D = MPD26Constants.SYSEX_MMC_HEADER + "02" + MPD26Constants.SYSEX_END;
MPD26Constants.STOP_D = MPD26Constants.SYSEX_MMC_HEADER + "01" + MPD26Constants.SYSEX_END;
MPD26Constants.FFW_D = MPD26Constants.SYSEX_MMC_HEADER + "04" + MPD26Constants.SYSEX_END;
MPD26Constants.FBW_D = MPD26Constants.SYSEX_MMC_HEADER + "05" + MPD26Constants.SYSEX_END;
MPD26Constants.REC_D = MPD26Constants.SYSEX_MMC_HEADER + "06" + MPD26Constants.SYSEX_END;
MPD26Constants.K1 = 3;
MPD26Constants.K2 = 9;
MPD26Constants.K3 = 14;
MPD26Constants.K4 = 15;
MPD26Constants.K5 = 16;
MPD26Constants.K6 = 17;
MPD26Constants.F1 = 20;
MPD26Constants.F2 = 21;
MPD26Constants.F3 = 22;
MPD26Constants.F4 = 23
MPD26Constants.F5 = 24;
MPD26Constants.F6 = 25;
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
        cursordevice.getMacro(macroid).getAmount().set(valuedec, 128);

}

function onSysex(data) {
  switch (data) {
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
          p("Not mapped Sysex message: " + data);
          break;
  }
}

function onMidi(status, data1, data2) {
    p("Midi: " + data1 + " Value: "+ data2);
    if (isChannelController(status)) {
            var index = data1;
            var valuedec = data2; //parseInt(valuehex, 16);
            //var controllerid = data.substring(0, 16);
            //var valuehex = data.substring(16, 18);
            switch (data1) {
                // Push buttons
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
                    userControls.getControl(index).set(data2, 128);
                    break;
                }
        }
    }

function t(value, length)
{
    p("selected");
}

// START MAIN
function init() {
    println(+ Date.now() +" Starting")
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
