var user = {id:'',to:'',load_online:'',send:[],typing:'',last_id:0};
var typing_delay = 2000; //in m second
if (!ajax_delay) var ajax_delay=1000;

function debug(s)
{
}

$(function()
{
	$(document.body).data('focus','yes');
	$('#content').keypress(function(event)
	{
		if (event.keyCode == 13)
		{
			send($(this).val());
			$(this).val('');
			event.preventDefault();
			user.typing = '';
		}
	});

	setInterval("window.user.load_online='yes';",30000);
	$.post('includes/online.php?t='+Math.random(),{ },function(s)
	{
		$('#online_num').html(s);
	});
	
	
	$('<iframe id="download_frame" style="display:none" name="download_frame"></iframe>').appendTo($(document.body));
	$(document.body).data('title',document.title);
	$(window).blur(function()
	{
		$(document.body).data('focus','no');
	}).focus(function()
	{
		on_focus();
		$('#content').focus();
	});
	
	$(document.body).keydown(on_focus).mousemove(on_focus);
	
	
	if (window.location.href.indexOf('#autostart') != -1)
	{
		setTimeout(init_chat,1000);
	}
	
});

function start_blur()
{
	try
	{
		clearTimeout(window.blur_timer);
	}	
	catch(e)
	{
	}
	window.blur_timer = setTimeout(function()
	{	
		$(document.body).data('focus','no');
	},10000);
}

function on_focus()
{
	try
	{
		clearTimeout(window.blur_timer);
	}	
	catch(e)
	{
	}
	$(document.body).data('focus','yes');
	start_blur();
}

function init_chat()
{
	if (user && user.id) return;
	user.id = '';
	user.to = '';
	$('#front_page').fadeOut(400,function() //hide front page
	{
		$('#chat_page').fadeIn(400,init_window); //show chat page
		init_window();                      //Initialization
		setTimeout(init_window,1);
	});
	
	$('#content').focus();
			
	$('<div id="typing"></div>').html(lang.typing).css('opacity',0).appendTo($('#chat_window'));
	show_notification(lang.logining);
	
	$.get('includes/start.php?t='+Math.random(),{},function(_id)
	{
		id = parseInt(_id);
		if (id)
		{
			user.id = id;
			
			show_notification(lang.logined);
			show_notification(lang.waiting);
			load_event(user.id);
		
			$('#content').keydown(function()
			{
				if (user.typing == 'yes' || !user.to) return;
				user.typing = 'yes';
				setTimeout("window.user.typing='';",typing_delay);
			});
			
			$(window).bind('unload',function(event)
			{
				if (user && user.id && user.to)
				{
					disconnect(1);
					alert(lang.bye);
				}
			});
		}
		else
			alert(_id);
	});
}


function send(s)
{
    if (!s || !user.to || !user.id) return;
	show_msg(lang.me+s,1);
	user.typing = '';
	user.send.push(s);

}

function load_event(id)
{
	debug('load_event:'+id);
	debug(user);
	if (!user || !user.id || user.id != id) return;
	
	if (user.send.length>0)
		user.send_content = user.send.shift();
	else
		user.send_content = '';
	
	$.post('includes/event.php',user,function(_data)
	{
		user.load_online = '';
		if (_data && _data.events )
		{
			//send status
			if (user.send_content && _data['send_status'] == 'ok')
			{
				$('.sending').eq(0).html(lang.me+_data['send_content']).removeClass('sending').css('opacity',1);
			}
			else if (user.send_content)
			{
				$('.sending').eq(0).html(lang.me+lang.send_error).removeClass('sending').css('opacity',1);
			}
			user.send_content = '';
			
			//online 
			if (_data.online)
			{
				$('#online_num').html(_data.online);
			}
			
			for(var i=0;i<_data.events.length;i++)
			{
				var data = _data.events[i];
				user.last_id = data.id;
				if (data.type == 'connected' && data.from)
				{
					user.to = data.from;
					show_notification(lang.connected+data.content);
					user.load_online = 'yes';
				}
				else if (data.type == 'typing')
				{
					show_typing();
				}
				else if (data.type == 'msg' && data.content)
				{
					show_msg(lang.stranger+data.content);
					stop_typing();
				}
				else if (data.type == 'disconnect')
				{
					delete(user.id);
					delete(user.to);
					show_notification(lang.disconnected);
					show_reconnect();
				}
			}
		}
		setTimeout("load_event(user.id)",ajax_delay);
	},'json');
}

function show_notification(s)
{
	$('#typing').before($('<div class="notification"></div>').html(s));
	$('#chat_window').get(0).scrollTop = $('#chat_window').get(0).scrollHeight;
	toggle_title(1000);
}

function show_msg(s,me)
{
	s=replace_em(s);
	if (!me)
	{
		$('#typing').css('opacity','0');
		s = '<span style="color:#FF5E5E; font-size:26px">'+s+'</span>'
        +'<script type="text/javascript">chatSound.play();</script>'; //strager receive msg sound;
        s = '<div id="strager" class="bubble">'+s+'</div>';
		var msg = $('<div id="strager_msg" class=""></div>').html(s);
		$('#typing').before(msg);
        toggle_title(300);
	}
	else
	{
        s = '<span id="leftMsg" style="color:#1f6377; font-size:26px">'+s+'</span>';  //me msg css
		s = '<div id="me" class="bubble bubble--alt">'+s+'</div>';
        var msg = $('<div id="me_msg" class=""></div>').html(s);
        $('#typing').before(msg);
		$('#content').focus();

	}
	msg.width('0%').animate({width:'100%'},300);
	$('#chat_window').get(0).scrollTop = $('#chat_window').get(0).scrollHeight;
}

//vertalen emotion
function replace_em(str){
    str = str.replace(/\</g,'&lt;');
    str = str.replace(/\>/g,'&gt;');
    str = str.replace(/\n/g,'<br/>');
    str = str.replace(/\[em_([0-9]*)\]/g,'<img src="motion_face_plugin/arclist/$1.gif" border="0" />');
    return str;
}

function show_typing()
{
	try{ clearTimeout(window.typing_timer);} catch(e) { }
	window.typing_timer = setTimeout(stop_typing,typing_delay+10);
	$('#typing').fadeTo(300,1);
	$('#chat_window').get(0).scrollTop = $('#chat_window').get(0).scrollHeight;
}

function stop_typing()
{
	$('#typing').fadeTo(300,0);
}

function show_reconnect()
{
	$('#typing').before($('<div class="noticication"></div>').html(
		'<input class="btn btn-success" type="button" onclick="reconnect()" value="'+lang.reconnect+'" />'+lang.contact_me
		+'&nbsp;<form action="includes/download.php" method="post" target="download_frame" onsubmit="this.content.value = $(\'#chat_window\').html();return true;">'
		+'<input type="hidden" name="content" />'
		+'<input type="hidden" name="url" value="'+window.location.href.replace(/\??t?=?[0-9\.]*#?[a-z]*$/i,'')+'" />'
		+'<input type="hidden" name="title" value="'+$(document.body).data('title')+'" />'
		//+'<input class="btn btn-warning" type="submit" value="'+lang.download+'" /></form>'
		));
	$('#typing').remove();
	$('#chat_window').get(0).scrollTop = $('#chat_window').get(0).scrollHeight;
}

function reconnect()
{
    $( "#content" ).prop( "disabled", false );
    init_chat();
	//window.location.href = window.location.href.replace(/\??t?=?[0-9\.]*#?[a-z]*$/i,'')+'?t='+Math.random()+'#autostart';
}

function toggle_title(t)
{
	if (t>0 && $(document.body).data('focus') == 'no')
	{
		switch(t%3)
		{
			case 1:
				document.title = lang.new_msg;
				break;
			case 2:
				document.title = '_____________________';
				break;
			case 0:
				document.title = $(document.body).data('title');
				break;
		}
		setTimeout("toggle_title("+(t-1)+")",1000);	
	}
	else
	{
		document.title = $(document.body).data('title');
	}
}

function send_bt()
{
    send($('#content').val());
	$('#content').val('').focus();
    scrollDown();
}

//keypress event, scroll always down
function scrollDown(){
    var scroll_down=$('#main_page');
    scroll_down.scrollTop(scroll_down[0].scrollHeight);
}

function disconnect(force)
{
	if (!user.id || !user.to) return;
	$.post('includes/disconnect.php',{id:user.id,to:user.to},function(s)
	{
		if (s == 'win')
		{
			show_reconnect();
            $( "#content" ).prop( "disabled", true );
		}
		else
		{
			alert(s);
		}
	});
	delete(user.id);
	delete(user.to);
	show_notification(lang.you_disconnect);
}