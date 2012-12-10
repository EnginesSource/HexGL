 /*
 * HexGL
 * @author Thibaut 'BKcore' Despoulain <http://bkcore.com>
 * @license This work is licensed under the Creative Commons Attribution-NonCommercial 3.0 Unported License. 
 *          To view a copy of this license, visit http://creativecommons.org/licenses/by-nc/3.0/.
 */

'use strict';
'v1.0.1';

var bkcore = bkcore || {};
bkcore.hexgl = bkcore.hexgl || {};

bkcore.hexgl.Sounds = function(opts)
{
	this.enabled = false;
	try {
		this.context = new webkitAudioContext();
	} catch(e) {
		return;
	}
	this.hexgl = opts.hexgl;
	this.spatialData = this.context.listener;
	this.sfxGain = this.context.createGainNode();
	this.sfxGain.connect(this.context.destination);
	this.bgmGain = this.context.createGainNode();
	this.bgmGain.connect(this.context.destination);
	this.bgmGain.gain.setValueAtTime(0.7, 0);
	this.music = null;
	this.enabled = !opts.disabled;
}

bkcore.hexgl.Sounds.prototype.setPosition = function(p)
{
	if(!this.spatialData) return;
	this.spatialData.setPosition(p.x, p.y, p.z);
}

bkcore.hexgl.Sounds.prototype.setOrientation = function(o, up)
{
	if(!this.spatialData) return;
	up = up || {x: 0, y: 1, z: 0};
	this.spatialData.setOrientation(o.x, o.y, o.z, up.x, up.y, up.z);
}

bkcore.hexgl.Sounds.prototype.setVelocity = function(v)
{
	if(!this.spatialData) return;
	this.spatialData.setVelocity(v.x, v.y, v.z);
}

bkcore.hexgl.Sounds.prototype.setMusic = function(track)
{
	if(!this.enabled) return;

	if(this.music)
	{
		this.music.element.stop();
		this.music.node.disconnect(this.bgmGain);
	}

	this.music = {
		element: track,
		node: this.context.createMediaElementSource(track)
	};

	this.music.node.connect(this.bgmGain);

	track.play();
	track.loop = true;

	track.onended = function() {
		track.currentTime = 0;
		track.play();
	};
}

bkcore.hexgl.Sounds.prototype.update = function(dt)
{
	if(!this.enabled) return;

	var shipControls = this.hexgl.components.shipControls
	this.setPosition(shipControls.mesh.position);
	this.setOrientation(shipControls.mesh.rotation, shipControls.mesh.up);
	this.setVelocity(shipControls.currentVelocity);
}


bkcore.hexgl.Sounds.Source = function(opts)
{
	this.type = opts.type
	this.isSpatialized = !!opts.isSpatialized
}

bkcore.hexgl.Sounds.Source.prototype.setPosition = bkcore.hexgl.Sounds.prototype.setPosition
bkcore.hexgl.Sounds.Source.prototype.setOrientation = bkcore.hexgl.Sounds.prototype.setOrientation
bkcore.hexgl.Sounds.Source.prototype.setVelocity = bkcore.hexgl.Sounds.prototype.setVelocity

bkcore.hexgl.Sounds.Source.prototype.connect = function()
{
	if (!this.sounds.enabled) return;

	var dst = this.sounds[this.type + 'Gain'];

	if(this.isSpatialized)
		this.spatialData.connect(dst);
	else
		this.gain.connect(dst);
}

bkcore.hexgl.Sounds.Source.prototype.disconnect = function()
{
	if (!this.sounds.enabled) return;

	var dst = this.sounds[this.type + 'Gain'];

	if(this.isSpatialized)
		this.spatialData.disconnect(dst);
	else
		this.gain.disconnect(dst);
}

bkcore.hexgl.Sounds.Source.prototype.initSource = function ()
{
	if (!this.sounds.enabled) return;

	this.gain = this.sounds.context.createGainNode();
	this.spatialData = null;

	if(this.isSpatialized)
	{
		this.spatialData = this.sounds.context.createPanner();
		this.spatialData.rolloffFactor = 1;
		this.gain.connect(this.spatialData);
	}
}


bkcore.hexgl.Sounds.Simple = function(opts)
{
	this.sounds = opts.sounds;

	if (!this.sounds.enabled) return;

	this.sample = opts.sample;
	this.initSource();
	this.initGraph();
	if("gain" in opts)
		this.gain.gain.setValueAtTime(opts.gain, 0);
}

bkcore.hexgl.Sounds.Simple.prototype = new bkcore.hexgl.Sounds.Source({
	type: 'sfx',
	isSpatialized: true
});

bkcore.hexgl.Sounds.Simple.prototype.initGraph = function()
{
	var bufferSource = this.sounds.context.createBufferSource();
	bufferSource.buffer = this.sample;

	this.nodes = {
		bufferSource: bufferSource
	};

	bufferSource.connect(this.gain);
}

bkcore.hexgl.Sounds.Simple.prototype.start = function(time)
{
	if(!this.sounds.enabled) return;

	this.connect();
	this.nodes.bufferSource.noteOn(this.sounds.context.currentTime + (time||0));
}

bkcore.hexgl.Sounds.ShipEngine = function(opts)
{
	this.sounds = opts.sounds;

	if(!this.sounds.enabled) return;

	this.shipControls = opts.shipControls;
	this.initSource();
	this.initGraph();
}

bkcore.hexgl.Sounds.ShipEngine.prototype = new bkcore.hexgl.Sounds.Source({
	type: 'sfx',
	isSpatialized: false
});

bkcore.hexgl.Sounds.ShipEngine.prototype.initGraph = function()
{
	var DEFAULT_FREQ = 6200;

	var ctx = this.sounds.context;
	var noise = WAUtils.createNoiseSource(ctx);
	var noiseAm = ctx.createGainNode();
	var osc = ctx.createOscillator();
	var osc2 = ctx.createOscillator();
	var osc2Am = ctx.createGainNode();

	noise.connect(noiseAm);
	noiseAm.connect(osc.detune);
	osc2.connect(osc2Am);
	osc2Am.connect(osc.frequency);

	osc.type = osc.SQUARE;

	noise.noteOn(0);
	osc.noteOn(0);
	osc2.noteOn(0);

	noiseAm.gain.setValueAtTime(150, 0);
	osc.frequency.setValueAtTime(DEFAULT_FREQ, 0);
	osc2Am.gain.setValueAtTime(220, 0);
	osc2.frequency.setValueAtTime(1760, 0);

	this.nodes = {
		noiseSource: noise,
		noiseAmountControl: noiseAm,
		oscillator: osc,
		controllerOscillator: osc2,
		controllerOscillatorControl: osc2Am
	};

	osc.connect(this.gain);
	this.gain.gain.setValueAtTime(0.09, 0);
}

bkcore.hexgl.Sounds.ShipEngine.prototype.update = function(dt)
{
	if(!this.sounds.enabled) return;

	var thrust = 6200;
	thrust += 800 * this.shipControls.getRealSpeedRatio();

	this.nodes.oscillator.frequency.exponentialRampToValueAtTime(thrust, this.sounds.context.currentTime + dt / 1000);
}
