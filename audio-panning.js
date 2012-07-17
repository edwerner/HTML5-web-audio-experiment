function BufferLoader( context, urlList, callback ) 
{
  this.context = context;
  this.urlList = urlList;
  this.onload = callback;
  this.bufferList = new Array( );
  this.loadCount = 0;
}

BufferLoader.prototype.loadBuffer = function( url, index ) 
{
  // load buffer asynchronously
  var request = new XMLHttpRequest( );
  request.open( "GET", url, true );
  request.responseType = "arraybuffer";

  var loader = this;

  request.onload = function( ) 
  {
    // asynchronously decode the audio file data in request.response
    loader.context.decodeAudioData(
      request.response,
      function( buffer ) 
      {
        if ( !buffer ) 
        {
          alert( 'error decoding file data: ' + url );
          return;
        }
        loader.bufferList[ index ] = buffer;
        if ( ++loader.loadCount == loader.urlList.length )
          loader.onload( loader.bufferList );
      }
    );
  }

  request.onerror = function( ) 
  {
    alert( 'BufferLoader: XHR error' );
  }

  request.send( );
}

BufferLoader.prototype.load = function( ) 
{
  for ( var i = 0; i < this.urlList.length; ++i )
  this.loadBuffer( this.urlList[ i ], i );
}


window.onload = init;
var context;
var bufferLoader;

function init( ) 
{
  context = new webkitAudioContext( );

  bufferLoader = new BufferLoader(
    context,
    [
      'http://www.noiseaddicts.com/samples/71.mp3',
      'http://www.noiseaddicts.com/samples/71.mp3',
    ],
    finishedLoading
    );

  bufferLoader.load( );
}

function finishedLoading( bufferList ) 
{
  // create two sources and play them both together.
  var source1 = context.createBufferSource( );
  var source2 = context.createBufferSource( );
  source1.buffer = bufferList[ 0 ];
  source2.buffer = bufferList[ 1 ];

  source1.connect( context.destination );
  source2.connect( context.destination );
  source1.noteOn( 0 );
  source2.noteOn( 0 );
}

var CrossfadePlaylistSample = {
  FADE_TIME: 1, // seconds
  playing: false
};

CrossfadePlaylistSample.play = function( ) 
{
  var ctx = this;
  playHelper( BUFFERS.jam, BUFFERS.crowd );

  function createSource( buffer ) 
  {
    var source = context.createBufferSource( );
    var gainNode = context.createGainNode( );
    source.buffer = buffer;
    // connect source to gain.
    source.connect( gainNode );
    // connect gain to destination.
    gainNode.connect( context.destination );

    return {
      source: source,
      gainNode: gainNode
    };
  }

  function playHelper( bufferNow, bufferLater ) 
  {
    var playNow = createSource( bufferNow );
    var source = playNow.source;
    ctx.source = source;
    var gainNode = playNow.gainNode;
    var duration = bufferNow.duration;
    var currTime = context.currentTime;
    // fade the playNow track in.
    gainNode.gain.linearRampToValueAtTime( 0, currTime );
    gainNode.gain.linearRampToValueAtTime( 1, currTime + ctx.FADE_TIME );
    // play the playNow track.
    source.noteOn( 0 );
    // at the end of the track, fade it out.
    gainNode.gain.linearRampToValueAtTime( 1, currTime + duration-ctx.FADE_TIME );
    gainNode.gain.linearRampToValueAtTime( 0, currTime + duration );
    // schedule a recursive track change with the tracks swapped.
    var recurse = arguments.callee;
    ctx.timer = setTimeout( function( ) 
    {
      recurse( bufferLater, bufferNow );
    }, ( duration - ctx.FADE_TIME ) * 1000 );
  }

};

CrossfadePlaylistSample.stop = function( ) 
{
  clearTimeout( this.timer );
  this.source.noteOff( 0 );
};

CrossfadePlaylistSample.toggle = function( ) 
{
  this.playing ? this.stop( ) : this.play( );
  this.playing = !this.playing;
};