var smsHtml = document.querySelector('link[href="components/sms.html"]').import;
var smsContactHtml = smsHtml.querySelector('link[href="sms-contact.html"]').import.querySelector('#smscontact');
var smsMessageHtml = smsHtml.querySelector('link[href="sms-message.html"]').import.querySelector('#smsmessagecontainer');

var smsElement = document.getElementById("sms");

function isNumeric(val) {
		return Number(parseFloat(val))==val;
}
function getSortResult(value,sortDescending){
	if(value == 0){
		return 0;
	}
	if(value < 0){
		return sortDescending ? 1 : -1;
	}else{
		return sortDescending ? -1 : 1;
	}
}
function sortByField(sortFieldGetter, sortDescending){
	return function(c1,c2){
		var field1 = sortFieldGetter(c1);
		var field2 = sortFieldGetter(c2);
		if(!field1){
			if(!field2){
				return 0;
			}
			return getSortResult(1,sortDescending);
		}
		if(!field2){
			return getSortResult(-1,sortDescending);
		}
		if(isNumeric(field1)){
			return getSortResult(field1 - field2,sortDescending);
		}else{
			if(field1 < field2) return getSortResult(-1,sortDescending);
				if(field1 > field2) return getSortResult(1,sortDescending);
				return 0;
		}
	};
}
var ContactsGetter = function(deviceId){
	var googleDriveManager = new GoogleDriveManager();
	var me = this;
	this.deviceId = deviceId;
	var fileKey = "contacts=:=" + this.deviceId;
	var localContacts = localStorage[fileKey];
	this.contactsInfo = localContacts ? JSON.parse(localContacts) : null;
	this.lastsms = null;

	me.initContactsIfEmpty = function(){
		if(!me.contactsInfo){
			me.contactsInfo = {};
		}
		if(!me.contactsInfo.contacts){
			me.contactsInfo.contacts = [];
		}
	}
	me.saveLocalContacts = function(){
		localStorage[fileKey] = JSON.stringify(me.contactsInfo);
	}
	me.sortContacts = function(sortFieldGetter,sortDescending){
		if(me.contactsInfo.contacts){
			if(sortFieldGetter){
				me.contactsInfo.contacts.sort(sortByField(sortFieldGetter,sortDescending));
			}
		}
	}
	me.processResults = function(sortFieldGetter,sortDescending){
		if(!me.contactsInfo){
			console.log("Not processing yet. Contacts are empty");
			return;
		}
		if(!me.lastsms){
			console.log("Not processing yet. Last SMS are empty");
			return;
		}
		// console.log("Contacts Getter processing now!");
		me.initContactsIfEmpty();
		me.lastsms.doForAll(function(lastsms){
			var contact = me.contactsInfo.contacts.first(function(contact){
				return contact.number == lastsms.address;
			});
			if(!contact){
				contact = {"name":lastsms.address,"number":lastsms.address}
				me.contactsInfo.contacts.push(contact);
			}
			contact.lastsms = lastsms;
		});
		me.sortContacts(sortFieldGetter,sortDescending);
		me.saveLocalContacts();
		return me.contactsInfo;
	}
	this.addSms = function(sms){
		me.initContactsIfEmpty();
		var contact = me.contactsInfo.contacts.first(function(contact){
			return contact.number == sms.number;
		});
		if(!contact){
			contact = {"name":sms.number,"number":sms.number}
			me.contactsInfo.contacts.push(contact);
		}
		contact.lastsms = sms;
		contact.lastsms.address = sms.number;
		me.saveLocalContacts();
	}
	me.getLocalInfo = function(sortFieldGetter, sortDescending){
		if(me.contactsInfo){
			me.sortContacts(sortFieldGetter,sortDescending);
		}
		return me.contactsInfo;
	}
	me.getInfo = function(sortFieldGetter, sortDescending){		
		setRefreshing(true);
		me.contactsInfo = null;
		me.lastsms = null;
		return Promise
		.all([
			me.getLastSms(),
			me.getContacts()
		])
		.then(function(results){
			setRefreshing(false);
			return me.processResults(sortFieldGetter,sortDescending);
		})
		.catch(function(error){
			console.error(error);
			setRefreshing(false);
			return UtilsObject.errorPromise("Error downloading SMS files: " + error);
		});
	}
	me.getContactForNumber = UtilsObject.async(function* (numberToFind, local){
		var info = null;
		if(local){
			info = yield me.getLocalInfo(null,false);
		}else{
			info = yield me.getInfo(null,false);
		}
		var contact = info.contacts.first(function(contact){
			return contact.number == numberToFind;
		});
		if(!contact){
			contact = {"name":numberToFind,"number":numberToFind};
		}
		return contact;
	});
	me.getLastSms = function(){
		return googleDriveManager.downloadContent({
			fileName: "lastsms=:=" + me.deviceId
		})
		.then(function(lastsms){
			if(lastsms.error){
				var message = "Error getting lastsms: " + contacts.error.message;				
				return UtilsObject.errorPromise(message);
			}
			me.lastsms = lastsms;
			return lastsms;
		});
	}
	me.getContacts = function(){
		return googleDriveManager.downloadContent({
			fileName: "contacts=:=" + me.deviceId
		})
		.then(function(contactsInfo){
			if(contactsInfo.error){
				var message = "Error getting contacts: " + contacts.error.message;
				return UtilsObject.errorPromise(message);
			}
			me.contactsInfo = contactsInfo;
			return contactsInfo;

		});
	}
}
var ContactMessagesGetter = function(deviceId, contact){
	var me = this;

	var googleDriveManager = new GoogleDriveManager();
	me.deviceId = deviceId;
	me.number = contact.number;
	var fileKey = "sms=:=" + me.deviceId + "=:=" + me.number;
	me.contact = contact;
	var localMessages = localStorage[fileKey];
	me.messages = localMessages ? JSON.parse(localMessages) : null;

	this.saveLocalMessages = function(){
		if(me.messages){
			localStorage[fileKey] = JSON.stringify(me.messages);
		}
	}
	this.addSms = function(sms){
		if(!me.messages){
			me.messages = {"number":sms.number,smses:[]};
		}
		me.messages.smses.removeIf(function(existingSms){
			return existingSms.date == sms.date;
		});
		me.messages.smses.push(sms);
		me.saveLocalMessages();
	}
	this.getInfo = UtilsObject.async(function* (callback,callbackProgress,callbackError,sortFieldGetter, sortDescending, local){
		setRefreshing(true);
		if(me.messages){
			callback(me.messages);
		}else if(me.contact.lastsms){
			callback({"smses":[me.contact.lastsms]});
		}
		if(local){
			setRefreshing(false);
			return;
		}
		try{
			var messages = yield googleDriveManager.downloadContent({fileName: fileKey});
			if(messages.error){
				console.log("Error getting messsages for "+me.number+": " + contacts.error.message);
				callbackError(contacts.error.message);
				setRefreshing(false);
				return;
			}
			me.messages = messages;
			if(me.messages.smses){
				me.messages.smses.sort(sortByField(sortFieldGetter, sortDescending));
			}
			callback(me.messages);
			me.saveLocalMessages();
			setRefreshing(false);
		}catch(error){
			console.log("Error downloading lastsms file: " + error);
			delete localStorage[fileKey];
			var response = yield doPostWithAuthPromise(joinserver + "requestfile/v1/request?alt=json",
			{
				"deviceId":me.deviceId,
				"payload":me.number,
				"requestType":4,
				"senderId": localStorage.deviceId
			});
			console.log(response);
			if(!response.success){
				throw new Error(response.errorMessage);
			}
			var fileResponse = yield back.eventBus.waitFor(back.Events.FileResponse,60000);
			console.log("Response File");
			console.log(fileResponse.fileId);
			me.getInfo(callback,callbackProgress,callbackError,sortFieldGetter, sortDescending,false);
			setRefreshing(false);
		}
	});
}
var SmsApp = function(){

	var me = this;
	var smsTitleContainerElement = document.getElementById("smstitlecontainer");
	var smsInputContainerElement = document.getElementById("smssendcontainer");
	var smsInputElement = document.getElementById("smsinput");
	var smsTitleElement = document.getElementById("smstitle");
	var contactFindContainerElement = document.getElementById("contactfindcontainer");
	var contactFindInputElement = document.getElementById("contactfindinput");
	var smsContainerElement = document.getElementById("smscontainer");
	var newSmsButton = document.getElementById("newsmsbutton");
	var newSmsButtonIcon = document.getElementById("newsmsbuttonicon");
	var newCallButtonIcon = document.getElementById("newcallbuttonicon");
	smsInputElement.addEventListener("keydown",function(e){
		if(e.keyCode == 13 && !e.shiftKey){
			e.preventDefault();
			me.sendSms();
		}
	});
	smsInputElement.addEventListener("keyup",function(e){
		localStorage.smsDraft = smsInputElement.value;
	});
	if(localStorage.smsDraft){
		smsInputElement.value = localStorage.smsDraft;
	}
	newSmsButtonIcon.addEventListener("click",function(e){
		// console.log("new SMS");
		me.writeContactListFunction = smsApp.writeContactListForSms;
		me.writeContactListFunction(contactFindInputElement.value);
	});
	newCallButtonIcon.addEventListener("click",function(e){
		// console.log("new SMS");
		me.writeContactListFunction = smsApp.writeContactListForCall;
		me.writeContactListFunction(contactFindInputElement.value);
	});
	contactFindInputElement.addEventListener("input",function(e){
		me.writeContactListFunction(contactFindInputElement.value);
	});
	me.contactFindInputElementEnterFunc = null;
	contactFindInputElement.addEventListener("keyup",function(e){
		if(e.keyCode == 13){
			if(me.contactFindInputElementEnterFunc){
				me.contactFindInputElementEnterFunc();
			}
		}
	});
	var deviceIdFromUrl = getURLParameter("deviceId");
	var numberFromUrl = getURLParameter("number");
	var textFromUrl = getURLParameter("text");
	// console.log("Checking URL for params");
	// console.log(deviceIdFromUrl + ";"+numberFromUrl);
	this.deviceId = deviceIdFromUrl ? deviceIdFromUrl : localStorage.smsDeviceId;
	me.contact = numberFromUrl ? {"number":numberFromUrl,"name":getURLParameter("name")} : (localStorage.smsDeviceContact ? JSON.parse(localStorage.smsDeviceContact) : null);
	this.number = null;
	me.contactsScroll = null;

	me.clearSmsNotification = function(){
		back.getCurrentTabPromise()
		.then(function(currentTab){
			if(isPopup){
				if(!currentTab){
					return;
				}
				if(!currentTab.url){
					return;
				}
				if(currentTab.url != window.location.toString()){
					return;
				}
			}
			if(localStorage.selectedTab != "sms"){
				return;
			}
			if(!me.number){
				return;
			}
			back.notifications.where(function(notification){
				return notification.id == UtilsSMS.getNotificationId(me.deviceId, me.number);
			}).doForAll(function(notification){
				setTimeout(function(){
					notification.cancel();
				},2000);
			});
		});
	}
	var setPlaceholderText = function(text){
		smsContainerElement.innerHTML = "<h5 id='tabsplaceholder'>"+text+"</h5>";
	}
	var setTitleText = function(text){
		smsTitleElement.innerHTML = text;
	}
	var showTitle = function(show){
		showNewSmsButton(!show);
		if(!show){
			smsTitleContainerElement.classList.add("hidden");
		}else{
			smsTitleContainerElement.classList.remove("hidden");
		}
	}
	if(isPopup){
		smsTitleContainerElement.classList.add("inpopup");
	}else{
		smsTitleContainerElement.classList.remove("inpopup");
	}
	var showInput = function(show){
		if(!show){
			smsInputContainerElement.classList.add("hidden");
		}else{
			smsInputContainerElement.classList.remove("hidden");
		}
	}
	var showContactFind = function(show){
		if(!show){
			contactFindContainerElement.classList.add("hidden");
		}else{
			contactFindContainerElement.classList.remove("hidden");
			contactFindInputElement.focus();
		}
	}
	var showNewSmsButton = function(show){
		if(!show){
			newSmsButton.classList.add("hidden");
		}else{
			newSmsButton.classList.remove("hidden");
		}
	}
	me.addSms = function(deviceId,sms){
		var contact = {"number":sms.number, "lastsms": sms};
		var contactsGetter = new ContactsGetter(deviceId);
		contactsGetter.addSms(sms);
		var contactMessagesGetter = new ContactMessagesGetter(deviceId,contact);
		contactMessagesGetter.addSms(sms);
	}
	me.receiveSms= function(deviceId, sms){
		sms.date = Date.now();
		sms.received = true;
		me.addSms(deviceId,sms);
	}
	if(textFromUrl){
		me.receiveSms(deviceIdFromUrl,{"number":numberFromUrl,"text":textFromUrl});
	}
	var findContactForElement = function(element){
		var element = event.target;
		while(!element.contact){
			element = element.parentElement;
		}
		var contact = element.contact;
		return contact;
	}
	var writeContactsInfo = function(deviceId, contactsInfo){
		if(contactsInfo && contactsInfo.contacts){
			var contacts = contactsInfo.contacts;
			smsContainerElement.innerHTML = "";
			for (var i = 0; i < contacts.length; i++) {
					var contact = contacts[i];
					if(contact.lastsms){
						var contactElement = smsContactHtml.cloneNode(true);
						contactElement.contact = contact;
						var contactNameElement = contactElement.querySelector("#smscontactname");
						var contactCallElement = contactElement.querySelector("#smscontactcall");
						var contactTextElement = contactElement.querySelector("#smscontacttext");
						var contactDateElement = contactElement.querySelector("#smscontactdate");
						contactNameElement.innerHTML = contact.name;
						contactTextElement.innerHTML = (contact.lastsms.received ? "" : "You: " )+ contact.lastsms.text;
						contactDateElement.innerHTML = contact.lastsms.date.formatDate(false);

						contactElement.addEventListener("click",function(event){
							var contact = findContactForElement(event.target);
							me.contactsScroll = smsContainerElement.scrollTop;
							me.writeContactMessages(deviceId, contact);
						});
						contactCallElement.addEventListener("click",function(event){
							var contact = findContactForElement(event.target);
							back.pushCall(me.deviceId,true,contact);
							event.stopPropagation();
						});
						smsContainerElement.appendChild(contactElement);
					}
			}
			if(me.contactsScroll){
				smsContainerElement.scrollTop = me.contactsScroll;
			}else{						
				smsContainerElement.scrollTop = 0;
			}
		}
	};
	me.writeSms = UtilsObject.async(function* (deviceId, local){
		me.number = null;
		me.contact = null;
		delete localStorage.smsDeviceContact;
		me.deviceId = deviceId;
		setPlaceholderText("Getting SMS messages and contacts...");
		showTitle(false);
		showInput(false);
		showContactFind(false);
		var contactsGetter = new ContactsGetter(deviceId);
		var sortFunc = function(contact){
			var lastsms = contact.lastsms;
			if(!lastsms){
				return null;
			}
			return lastsms.date;
		};
		var sortDescending = true;
		try{
			writeContactsInfo(deviceId, yield contactsGetter.getLocalInfo(sortFunc,sortDescending));
			if(!local){
				writeContactsInfo(deviceId, yield contactsGetter.getInfo(sortFunc,sortDescending));
			}
		}catch(error){
			console.error(error);
			setPlaceholderText(error + "<br/><br/>Make sure the SMS Service is enabled on this device in the Android App -&gt; Settings -&gt; SMS.<br/>If it is, go back to the devices tab here in Chrome, click on your device and select 'Send an SMS message' to re-select your device.");
		}
	});

	me.writeContactMessages = function(deviceId, contact, local){
		me.deviceId = deviceId;
		me.contact = contact;
		localStorage.smsDeviceContact = JSON.stringify(me.contact);
		var name = contact.name;
		var number = contact.number;
		me.number = number;
		setPlaceholderText("Getting Messages for "+ name +"...");
		var title = name;
		setTitleText(title);
		showTitle(true);
		showInput(true);
		showContactFind(false);

		me.clearSmsNotification();
		smsInputElement.placeholder = "Send message to " + number;
		smsInputElement.focus();
		var contactMessagesGetter = new ContactMessagesGetter(deviceId,contact);
		contactMessagesGetter.getInfo(function(contactMessages){
			var smses = contactMessages.smses;
			if(!contactMessages || !contactMessages.smses){
				setPlaceholderText("No messages for " + name);
				return;
			}
			smsContainerElement.innerHTML = "";
			for (var i = 0; i < smses.length; i++) {
				var sms = smses[i];
				var smsMessageContainerElement = smsMessageHtml.cloneNode(true);
				smsMessageContainerElement.sms = sms;
				var triangleElement = smsMessageContainerElement.querySelector("#smsbubbletriangle");
				var triangleElementReceived = smsMessageContainerElement.querySelector("#smsbubbletrianglereceived");
				var smsMessageElement = smsMessageContainerElement.querySelector("#smsmessage");
				var smsTextElement = smsMessageElement.querySelector("#smsmessagetext");
				var smsDateElement = smsMessageElement.querySelector("#smsmessagedate");
				var smsLoaderElement = smsMessageElement.querySelector("#smsmessageprogress");

				var smsText = sms.text;
				if(smsText){
					smsText = smsText.replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll("\n","<br/>")	
				}
				smsTextElement.innerHTML = Autolinker.link(smsText);
				smsDateElement.innerHTML = sms.date.formatDate(true);
				if(sms.received){
					smsMessageElement.classList.add("received");
					triangleElement.style.display = "none";
				}else{
					smsMessageContainerElement.classList.add("sent");
					triangleElementReceived.style.display = "none";
				}
				if(!sms.progress){
					smsLoaderElement.classList.add("hidden");
				}else{
					smsLoaderElement.classList.remove("hidden");
				}
				smsContainerElement.appendChild(smsMessageContainerElement);
			}
			smsContainerElement.scrollTop = smsContainerElement.scrollHeight;
		},function(progress){
			setPlaceholderText(progress);
		},function(error){
			setPlaceholderText("Error getting Messages for "+ name +": " + error);
		},function(sms){
			return sms.date;
		},false,local);
	}
	me.writeContactListForSms = function(filter){
		me.writeContactList(filter,function(deviceId, contact){
			me.writeContactMessages(deviceId, contact);
		});
	}
	me.writeContactListFunction = me.writeContactListForSms;
	me.writeContactListForCall = function(filter){
		me.writeContactList(filter,function(deviceId, contact){
			back.pushCall(deviceId, true, contact);
		});
	}
	var writeContactListFromInfo = function(filter, contactsInfo, callback){
		// console.log(contactsInfo);
		if(contactsInfo.contacts){
			var contacts = contactsInfo.contacts;
			smsContainerElement.innerHTML = "";
			if(filter){
				filter = filter.toLowerCase();
			}
			var addContactToList = function(contact){
				var contactElement = smsContactHtml.cloneNode(true);
					contactElement.contact = contact;
					var contactNameElement = contactElement.querySelector("#smscontactname");
					var contactCallElement = contactElement.querySelector("#smscontactcall");
					var contactTextElement = contactElement.querySelector("#smscontacttext");
					var contactDateElement = contactElement.querySelector("#smscontactdate");
					contactNameElement.innerHTML = contact.name;
					contactTextElement.innerHTML = contact.number;
					contactCallElement.innerHTML = "";
					contactDateElement.innerHTML = "";

					contactElement.addEventListener("click",function(event){
						var element = event.target;
						while(!element.contact){
							element = element.parentElement;
						}
						var contact = element.contact;
						callback(me.deviceId, contact)
					});
					smsContainerElement.appendChild(contactElement);
					me.contactFindInputElementEnterFunc = ()=>{
						if(smsContainerElement.children.length > 0){
							var contact = smsContainerElement.children[0].contact;
							callback(me.deviceId, contact);
						}
					}
			}
			for (var i = 0; i < contacts.length; i++) {
					var contact = contacts[i];
					var numberForFilter = contact.number.replace(" ","").replace("+","").replace("-","");
					if(!filter || contact.name.toLowerCase().indexOf(filter) >= 0 || numberForFilter.indexOf(filter) >= 0){
						addContactToList(contact);
					}
			}
			if(filter && filter.match(/[0-9]+/) == filter){
				addContactToList({"name":"Unlisted Contact","number": filter});
			}
		}
	}
	me.writeContactList = function(filter,callback){
		setTitleText("Contacts");
		showTitle(true);
		showContactFind(true);
		var sortFunc = function(contact){
			return contact.name;
		};
		var sortDescending = false;
		var contactsGetter = new ContactsGetter(me.deviceId);
		writeContactListFromInfo(filter, contactsGetter.getLocalInfo(sortFunc,sortDescending),callback);
	}
	this.sendSms = function(){
		var text = smsInputElement.value;
		if(!text){
			return;
		}
				var push = new back.GCMPush();
				push.smsnumber = me.number;
				push.smstext = text;
				push.senderId = me.deviceId;
				push.responseType = 0;
				push.requestId = "SMS";
		var sms = {"text": text,"number":me.number,"progress":true};
				var sendSmsResult = function(event){
					sms.progress = false;
					back.removeEventListener("smssent",sendSmsResult,false);
					if(event.success){
							// console.log("SMS pushed");
							//back.showNotification("Join","SMS sent!");
					}else{
							var error = "Error sending SMS: " + event.errorMessage;
							console.log(error);
							back.showNotification("Join",error);
					}
			me.addSms(me.deviceId,sms);
			me.refresh(true);
			var isReply = getURLParameter("reply");
			if(isReply){
				window.close();
			}
				};
				back.addEventListener("smssent",sendSmsResult,false);
				push.send(me.deviceId);
				//back.showNotification("Join","SMS pushed. Waiting for response...");
		sms.date = Date.now();
		sms.received = false;
		me.addSms(me.deviceId,sms);
		me.refresh(true);
		me.newInput();
		me.clearSmsNotification();
	}
	this.newInput = function(){
		smsInputElement.value = "";
		smsInputElement.focus();		
		delete localStorage.smsDraft;
	}
	this.refresh = function(local){
		if(me.contact){
			me.writeContactMessages(me.deviceId,me.contact,local);
		}else{
			me.writeSms(me.deviceId,local);
		}
	}

	document.querySelector("#smstitlecontainer").addEventListener("click",function(){
		me.writeSms(me.deviceId);
	});
	document.querySelector("#smssend").addEventListener("click",function(){
		me.sendSms();
	});
	if(me.deviceId){
		me.refresh(false);
	}
}

var smsApp = new SmsApp();
//smsApp.contact = localStorage.smsDeviceContact ? JSON.parse(localStorage.smsDeviceContact) : null;
var refreshSms = function(){
	smsApp.refresh();
}
var sendSms = function(event){
	var sms = event.sms;
	if(sms && sms.number){
		var contactsGetter = new ContactsGetter(event.deviceId);
		contactsGetter.getContactForNumber(sms.number,true)
		.then(function(contact){
			smsApp.writeContactMessages(event.deviceId,contact,false);
			smsReceived(event);
		});
	} else {
		smsApp.writeSms(event.deviceId);
	}
}
back.addEventListener("sendsms",sendSms,false);

var phoneCall = function(event){
	smsApp.deviceId = event.deviceId;
    smsApp.writeContactListFunction = smsApp.writeContactListForCall;
    smsApp.writeContactListFunction();
}
back.addEventListener("phonecall",phoneCall,false);

var smsReceived = function(event){
	// console.log("Received SMS in popup from " + event.deviceId);
	// console.log(event.sms);
	smsApp.receiveSms(event.deviceId,event.sms);
	smsApp.refresh(true);
	smsApp.clearSmsNotification();
}
back.addEventListener('smsreceived', smsReceived, false);

addEventListener("unload", function (event) {
	back.console.log("Unloading sms...");
	back.removeEventListener("sendsms",sendSms,false);
	back.removeEventListener("phonecall",phoneCall,false);
	back.removeEventListener('smsreceived',smsReceived,false);
}, true);
