let tCount = 0;
let tNick = "You";
let tChannel = "archonthewizard";
let oAuth = "";

let twitchWebSocket = null;

let hidePingSMS = true;
let hideNoticeSMS = false;
let hideUnknownSMS = true;
let hideAllSystemSMS = false;
let chatMessagesPrefix = "> ";
const maxChatMessages = 20;

const htmlConnectionInfoPanel = document.getElementById("ConnectionInfoPanel");
const htmlConnectionInfoSmallIcon = document.getElementById("btnConnectionInfoShow");
let connectionInfoPanelShowing = true;
function ShowConnectionInfoPanel(toggle = true)
{
    connectionInfoPanelShowing = toggle? !connectionInfoPanelShowing : false;
    htmlConnectionInfoPanel.style.display = connectionInfoPanelShowing? "flex" : "none";
}
const htmlBtnChatConnect = document.getElementById("btnChatConnect");
htmlBtnChatConnect.style.borderStyle = "solid";
htmlBtnChatConnect.style.borderWidth = "2px";
htmlBtnChatConnect.style.borderColor = "red";
const htmlChatMessageDivs = [];
for(let i = 0; i < maxChatMessages; i++)
{
    htmlChatMessageDivs.push({div:document.getElementById(`divChatMessage${i}`), parsedSMS:{rawData:chatMessagesPrefix, count:-1, type:"NONE", sender:"", sms:chatMessagesPrefix}});
    htmlChatMessageDivs[i].div.innerHTML = chatMessagesPrefix;
}
    
const htmlTowerToggle = [];
for(let i = 1; i <= 12; i++)
    htmlTowerToggle.push(document.getElementById(`tglTower${i}`));

const htmlTabButtons =
[
    document.getElementById("btnJoinTab"),
    document.getElementById("btnCharactersTab"),
    document.getElementById("btnSpellsTab"),
    document.getElementById("btnTargetsTab"),
    document.getElementById("btnSpecsTab")
];
const htmlTabPanels =
[
    document.getElementById("divJoinTab"),
    document.getElementById("divCharactersTab"),
    document.getElementById("divSpellsTab"),
    document.getElementById("divTargetsTab"),
    document.getElementById("divSpecsTab")
];

let messageQueue = [];
let lastMessageTime = new Date().getTime();

function TwitchWebSocket_SendQueue(message)
{
    if(twitchWebSocket.readyState==1 && messageQueue.length==0 && (new Date().getTime()-lastMessageTime)>=1250)
    {
        TwitchWebSocket_SendImmediate(message);
        lastMessageTime = new Date().getTime();
    }
    else
    {
        messageQueue.push(message);
    }
}

setInterval(TwitchWebSocket_CheckQueue, 1255);
function TwitchWebSocket_CheckQueue()
{
    if(twitchWebSocket && twitchWebSocket.readyState==1 && messageQueue.length>0 && (new Date().getTime()-lastMessageTime)>=1250)
    {
        TwitchWebSocket_SendImmediate(messageQueue.shift());
        lastMessageTime = new Date().getTime();
    }
}

setInterval(TwitchConnectionShowStatus, 250);
function TwitchConnectionShowStatus()
{
    /*WebSocket: readyState property
    WebSocket.CONNECTING (0)
    Socket has been created. The connection is not yet open.
    WebSocket.OPEN (1)
    The connection is open and ready to communicate.
    WebSocket.CLOSING (2)
    The connection is in the process of closing.
    WebSocket.CLOSED (3)
    The connection is closed or couldn't be opened.*/
    if(!twitchWebSocket || !(twitchWebSocket instanceof WebSocket))
    {
        htmlBtnChatConnect.style.borderColor = "red";
        if(htmlConnectionInfoSmallIcon)
            htmlConnectionInfoSmallIcon.style.borderColor = "red";
    }
    else if(twitchWebSocket.readyState==1)
    {
        htmlBtnChatConnect.style.borderColor = "green";
        if(htmlConnectionInfoSmallIcon)
            htmlConnectionInfoSmallIcon.style.borderColor = "green";
    }
    else if(twitchWebSocket.readyState==0)
    {
        htmlBtnChatConnect.style.borderColor = "yellow";
        if(htmlConnectionInfoSmallIcon)
            htmlConnectionInfoSmallIcon.style.borderColor = "yellow";
    }
    else if(twitchWebSocket.readyState==2)
    {
        htmlBtnChatConnect.style.borderColor = "orange";
        if(htmlConnectionInfoSmallIcon)
            htmlConnectionInfoSmallIcon.style.borderColor = "orange";
    }
    else//if(twitchWebSocket.readyState==3)
    {
        htmlBtnChatConnect.style.borderColor = "magenta";
        if(htmlConnectionInfoSmallIcon)
            htmlConnectionInfoSmallIcon.style.borderColor = "magenta";
    }
}

GetFormTwitchData();
function GetFormTwitchData()
{
    //tNick = document.getElementById("inputTNick").value;
    tNick = "You";
    tChannel = document.getElementById("inputTChat").value;
    oAuth = document.getElementById("inputOAuth").value;
}

function TwitchWebSocket_Connect()
{
    TwitchClearChat();
    GetFormTwitchData();
    if(tChannel==null || tChannel=="")
    {
        TwitchWebSocket_Recieve({data:`:CIC Studios!CIC Studios@CIC Studios.tmi.twitch.tv PRIVMSG #${tChannel.replace("#", "")} :Missing Channel Name. Please enter the name of the twitch channel you wish to connect to.\r\n`});
        return;
    }
    if(oAuth==null || oAuth=="")
    {
        TwitchWebSocket_Recieve({data:`:CIC Studios!CIC Studios@CIC Studios.tmi.twitch.tv PRIVMSG #${tChannel.replace("#", "")} :Missing Twitch OAuth (You must get this from https://twitchapps.com/tmi/) or from the connection panel above.\r\n`});
        return;
    }
        
    if(twitchWebSocket)
        twitchWebSocket.close();
    twitchWebSocket = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
    twitchWebSocket.onopen = TwitchWebSocket_Open;
    twitchWebSocket.onmessage = TwitchWebSocket_Recieve;
}

function TwitchWebSocket_Open()
{
    tCount=0;
    
    twitchWebSocket.send(`PASS oauth:${oAuth.replace("oauth", "").replace("oAuth", "").replace("OAuth", "").replace("OAUTH", "").replace(":", "").replace(/\s/g, "")}`);
    twitchWebSocket.send(`NICK ${tNick}`);
    twitchWebSocket.send(`JOIN #${tChannel.replace("#", "").replace(/\s/g, "")}`);
    ShowConnectionInfoPanel(false);
}

function TwitchWebSocket_Recieve(message)
{
    tCount++;
    const parsedSMS = {rawData:message, count:tCount};
    const PRIVMSG = message.data.indexOf("PRIVMSG #");
    if(PRIVMSG > -1)
    {
        parsedSMS.type = "PRIVMSG";
        parsedSMS.sender = message.data.substring(1, message.data.indexOf("!"));
        parsedSMS.sms = message.data.substring(message.data.indexOf(":",PRIVMSG+9)+1, message.data.length-2);
    }
    else
    {
        const PING = message.data.indexOf("PING");
        if(PING == 0)
        {
            parsedSMS.type = "PING";
            parsedSMS.sender = "System";
            parsedSMS.sms = "pinged";
            twitchWebSocket.send("PONG");
        }
        else
        {
            const NOTICE = message.data.indexOf("NOTICE *");
            if(NOTICE > -1)
            {
                parsedSMS.type = "NOTICE";
                parsedSMS.sender = "System";
                parsedSMS.sms = message.data.substring(message.data.indexOf(":",NOTICE+8)+1, message.data.length-2);
            }
            else
            {
                const JOIN = message.data.indexOf("JOIN #");
                if(JOIN > -1)
                {
                    const NICKEND = message.data.indexOf("!");
                    if(NICKEND > 1)
                        tNick = message.data.substring(1, NICKEND);
                    parsedSMS.type = "JOIN";
                    parsedSMS.sender = "System";
                    const channelEND = message.data.indexOf(":", JOIN+6)-2;
                    parsedSMS.sms = `Joined: #${message.data.substring(JOIN+6, channelEND>JOIN+6? channelEND : message.data.length-2)}`;
                }
                else
                {
                    if(tCount == 1)
                    {
                        parsedSMS.type = "WELCOME";
                        const HOST = message.data.indexOf(":", message.data.indexOf(":", message.data.indexOf(":",1)+1)+1);
                        const hostEND = HOST>-1? message.data.indexOf(":", HOST+1)-2 : message.data.length-2;
                        parsedSMS.sender = "System";
                        parsedSMS.sms = message.data.substring(HOST>-1? HOST+1 : 0, hostEND>-1? hostEND : message.data.length-2);
                    }
                    else
                    {
                        parsedSMS.type = "UNKNOWN";
                        parsedSMS.sender = "System";
                        parsedSMS.sms = message.data;
                    }
                }
            }
        }
    }
    
    if(parsedSMS.sender=="System")
        console.log(parsedSMS);
    if(hidePingSMS && parsedSMS.type=="PING")
        return;
    if(hideNoticeSMS && parsedSMS.type=="NOTICE")
        return;
    if(hideUnknownSMS && parsedSMS.type=="UNKNOWN")
        return;
    if(hideAllSystemSMS && parsedSMS.sender=="System")
        return;

    for(let i=htmlChatMessageDivs.length-1; i>0; i--)
    {
        htmlChatMessageDivs[i].div.innerHTML = htmlChatMessageDivs[i-1].div.innerHTML;
        htmlChatMessageDivs[i].parsedSMS = htmlChatMessageDivs[i-1].parsedSMS;
    }
    htmlChatMessageDivs[0].parsedSMS = parsedSMS;
    if(parsedSMS.sender=="System")
        htmlChatMessageDivs[0].div.innerHTML = `${chatMessagesPrefix}<span style="color:red">${parsedSMS.sender}</span>: ${parsedSMS.sms}`;    
    else if(parsedSMS.sender==tChannel.replace("#", ""))
        htmlChatMessageDivs[0].div.innerHTML = `${chatMessagesPrefix}<span style="color:yellow">${parsedSMS.sender}</span>: ${parsedSMS.sms}`;
    else if(parsedSMS.sender==tNick)
        htmlChatMessageDivs[0].div.innerHTML = `${chatMessagesPrefix}<span style="color:lime">${parsedSMS.sender}</span>: ${parsedSMS.sms}`;
    else
        htmlChatMessageDivs[0].div.innerHTML = `${chatMessagesPrefix}<span style="color:cyan">${parsedSMS.sender}</span>: ${parsedSMS.sms}`;
}

function TwitchWebSocket_SendImmediate(message)
{
    if(message==null || message=="")
        return;
    twitchWebSocket.send(`PRIVMSG #${tChannel.replace("#", "")} :${message}`);
    TwitchWebSocket_Recieve({data:`:${tNick}!${tNick}@${tNick}.tmi.twitch.tv PRIVMSG #${tChannel.replace("#", "")} :${message}\r\n`});
}

function TwitchWebSocket_Close()
{
    twitchWebSocket.close();
}

function TwitchClearChat()
{
    for(let i=0; i<htmlChatMessageDivs.length; i++)
    {
        htmlChatMessageDivs[i].div.innerHTML = chatMessagesPrefix;
        htmlChatMessageDivs[i].parsedSMS = {rawData:chatMessagesPrefix, count:-1, type:"NONE", sender:"", sms:chatMessagesPrefix};
    }
}

function TwitchGetOAuth()
{
    window.open('https://twitchapps.com/tmi/', '_blank')
    //window.open('https://id.twitch.tv/oauth2/authorize?client_id=6z3qkx3f4s3f1m9r0n8b9&redirect_uri=https://twitchapps.com/tmi/&response_type=token&scope=chat%3Aread+chat%3Aedit+commands', '_blank');
}

function TwitchViewStream()
{
    window.open(`https://twitch.tv/${tChannel.replace("#", "")}`, '_blank')
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function OpenLinkInNewWindow(url)
{
    window.open(url, '_blank');
}

const divChatMessage = document.getElementById("inputSendChatMessage");
function ChatMessage_Send()
{
    TwitchWebSocket_SendQueue(divChatMessage.value);
    divChatMessage.value = "";
}

const htmChatPanel = document.getElementById("RecievedChatMessagesPanel");
const htmChatToggle = document.getElementById("btnTglChat");
let showChat = true;
function ToggleChatVisibility()
{
    if(showChat)
    {
        htmChatPanel.style.display = "none";
        htmChatToggle.innerHTML = "Show";
        showChat = false;
    }
    else
    {
        htmChatPanel.style.display = "flex";
        htmChatToggle.innerHTML = "Hide";
        showChat = true;
    }
}

let selectedTab = 0;
let characterSlots = ["","","",""];
let selectionMode = -1; //-1=all 0=single 1=team1 2=team2
let singleSlot = 0;
let toggledTeam1 = [true,true,false,false];
let toggledTeam2 = [false,false,true,true];
let toggledTowers = [true,false,false,false,false,false,false,false,false,false,false,false];

const divsSelectionToggleButtons =
[
    document.getElementById("btnGroupSelectionAll"),
    document.getElementById("btnGroupSelectionSingle"),
    document.getElementById("btnGroupSelectionTeam1"),
    document.getElementById("btnGroupSelectionTeam2")
];

const divsSlotToggleButtons =
[
    document.getElementById("btnCharacterSlot1"),
    document.getElementById("btnCharacterSlot2"),
    document.getElementById("btnCharacterSlot3"),
    document.getElementById("btnCharacterSlot4")
];

const repeatProtection =
{
    archerShortcut: false,
    rogueShortcut: false,
    firemageShortcut: false,
    timemageShortcut: false,
    poisonerShortcut: false,
    bardShortcut: false,
    voteShortcut: false,
    towerShortcut: false,
    powerupShortcut: false,
    powerdownShortcut: false,
    powerlockShortcut: false,
    trainShortcut: false,
    altarShortcut: false,
    awakeShortcut: false,
    leaveShortcut: false,
    spellShortcut: false
};



function isShortcut(classname)
{
    switch(classname)
    {
        case "archer":
            return repeatProtection.archerShortcut;
        case "rogue":
            return repeatProtection.rogueShortcut;
        case "firemage":
            return repeatProtection.firemageShortcut;
        case "timemage":
            return repeatProtection.timemageShortcut;
        case "poisoner":
            return repeatProtection.poisonerShortcut;
        case "bard":
            return repeatProtection.bardShortcut;
        case "vote":
            return repeatProtection.voteShortcut;
        case "tower":
            return repeatProtection.towerShortcut;
        case "powerup":
            return repeatProtection.powerupShortcut;
        case "powerdown":
            return repeatProtection.powerdownShortcut;
        case "powerlock":
            return repeatProtection.powerlockShortcut;
        case "train":
            return repeatProtection.trainShortcut;
        case "altar":
            return repeatProtection.altarShortcut;
        case "awake":
            return repeatProtection.awakeShortcut;
        case "leave":
            return repeatProtection.leaveShortcut;
        case "spell":
            return repeatProtection.spellShortcut;
        default:
            return false;
    }
}
function ToggleShortcut(classname)
{
    switch(classname)
    {
        case "archer":
            repeatProtection.archerShortcut = !repeatProtection.archerShortcut;
            break;
        case "rogue":
            repeatProtection.rogueShortcut = !repeatProtection.rogueShortcut;
            break;
        case "firemage":
            repeatProtection.firemageShortcut = !repeatProtection.firemageShortcut;
            break;
        case "timemage":
            repeatProtection.timemageShortcut = !repeatProtection.timemageShortcut;
            break;
        case "poisoner":
            repeatProtection.poisonerShortcut = !repeatProtection.poisonerShortcut;
            break;
        case "bard":
            repeatProtection.bardShortcut = !repeatProtection.bardShortcut;
            break;
        case "vote":
            repeatProtection.voteShortcut = !repeatProtection.voteShortcut;
            break;
        case "tower":
            repeatProtection.towerShortcut = !repeatProtection.towerShortcut;
            break;
        case "powerup":
            repeatProtection.powerupShortcut = !repeatProtection.powerupShortcut;
            break;
        case "powerdown":
            repeatProtection.powerdownShortcut = !repeatProtection.powerdownShortcut;
            break;
        case "powerlock":
            repeatProtection.powerlockShortcut = !repeatProtection.powerlockShortcut;
            break;
        case "train":
            repeatProtection.trainShortcut = !repeatProtection.trainShortcut;
            break;
        case "altar":
            repeatProtection.altarShortcut = !repeatProtection.altarShortcut;
            break;
        case "awake":
            repeatProtection.awakeShortcut = !repeatProtection.awakeShortcut;
            break;
        case "leave":
            repeatProtection.leaveShortcut = !repeatProtection.leaveShortcut;
            break;
        case "spell":
            repeatProtection.spellShortcut = !repeatProtection.spellShortcut;
            break;
        default:
            break;
    }
}

function ToggleMainMenu()
{
    if(htmlMainMenu.style.display=="none")
        htmlMainMenu.style.display = "flex";
    else
        htmlMainMenu.style.display = "none";
}

function UpdateTabToggles(selectedTab)
{
    for(let i=0;i<htmlTabButtons.length;i++)
    {
        if(i==selectedTab)
        {
            htmlTabButtons[i].classList.remove("sdTabOff");
            htmlTabButtons[i].classList.add("sdTabOn");
            if(i<htmlTabPanels.length)
                htmlTabPanels[i].style.display = "flex";
        }
        else
        {
            htmlTabButtons[i].classList.remove("sdTabOn");
            htmlTabButtons[i].classList.add("sdTabOff");
            if(i<htmlTabPanels.length)
                htmlTabPanels[i].style.display = "none";
        }
    }
}

function UpdateSlotToggles(togglestates)
{
    if(togglestates.length!=4)
        return;

    for(let i=0;i<4;i++)
    {
        if(characterSlots[i]==null || characterSlots[i]=="")
            divsSlotToggleButtons[i].innerHTML = `Slot ${i+1}`;
        else
            divsSlotToggleButtons[i].innerHTML = characterSlots[i];

        if(togglestates[i])
        {
            divsSlotToggleButtons[i].classList.remove("sdToggleOff");
            divsSlotToggleButtons[i].classList.add("sdToggleOn");
        }
        else
        {
            divsSlotToggleButtons[i].classList.remove("sdToggleOn");
            divsSlotToggleButtons[i].classList.add("sdToggleOff");
        }
    }
}

function UpdateSelectionToggles(togglestates)
{
    if(togglestates.length!=4)
        return;

    for(let i=0;i<4;i++)
    {
        if(togglestates[i])
        {
            divsSelectionToggleButtons[i].classList.remove("sdToggleOff");
            divsSelectionToggleButtons[i].classList.add("sdToggleOn");
        }
        else
        {
            divsSelectionToggleButtons[i].classList.remove("sdToggleOn");
            divsSelectionToggleButtons[i].classList.add("sdToggleOff");
        }
    }
}

function UpdateTowerToggles(togglestates)
{
    for(let i=0;i<toggledTowers.length;i++)
    {
        if(togglestates[i])
        {
            htmlTowerToggle[i].classList.remove("sdToggleOff");
            htmlTowerToggle[i].classList.add("sdToggleOn");
        }
        else
        {
            htmlTowerToggle[i].classList.remove("sdToggleOn");
            htmlTowerToggle[i].classList.add("sdToggleOff");
        }
    }
}

function TabToggleClick(tabnum)
{
    if(tabnum<0 || tabnum>=htmlTabButtons.length || tabnum>=htmlTabPanels.length)
        return;
    selectedTab = tabnum;
    UpdateTabToggles(selectedTab);
}

function SelectToggleClick(selectID)
{
    if(selectID==selectionMode || selectID<-1 || selectID>2)
        return;

    selectionMode = selectID;
    UpdateSelectionToggles([selectionMode==-1,selectionMode==0,selectionMode==1,selectionMode==2]);
    if(selectionMode == -1) //All
        UpdateSlotToggles([true,true,true,true]);
    else if(selectionMode == 0) //Single
        UpdateSlotToggles([singleSlot==0,singleSlot==1,singleSlot==2,singleSlot==3]);
    else if(selectionMode == 1) //Team1
        UpdateSlotToggles(toggledTeam1);
    else if(selectionMode == 2) //Team2
        UpdateSlotToggles(toggledTeam2);
}

function SlotToggleClick(slotnum)
{
    if(slotnum<0 || slotnum>3)
        return;

    switch(selectionMode)
    {
        case -1: //All
            break;
        case 0: //Single
            singleSlot = slotnum;
            UpdateSlotToggles([singleSlot==0,singleSlot==1,singleSlot==2,singleSlot==3]);
            break;
        case 1: //Team1
            toggledTeam1[slotnum] = !toggledTeam1[slotnum];
            UpdateSlotToggles(toggledTeam1);
            break;
        case 2: //Team2
            toggledTeam2[slotnum] = !toggledTeam2[slotnum];
            UpdateSlotToggles(toggledTeam2);
            break;
    }
}

function TowerToggleClick(towernum)
{
    if(towernum<0 || towernum>=toggledTowers.length)
        return;
    toggledTowers[towernum] = !toggledTowers[towernum];
    UpdateTowerToggles(toggledTowers);
}

function SD_Reset()
{
    selectedTab = 0;
    UpdateTabToggles(selectedTab);
    characterSlots = ["","","",""];
    selectionMode = -1;
    singleSlot = 0;
    toggledTeam1 = [true,true,false,false];
    toggledTeam2 = [false,false,true,true];
    UpdateSlotToggles([true,true,true,true]);
    UpdateSelectionToggles([true,false,false,false]);
    for(let i=0;i<toggledTowers.length;i++)
        i==0? toggledTowers[i]=true : toggledTowers[i]=false;
    UpdateTowerToggles(toggledTowers);
}

function SD_Join(classname)
{
    let charPos = -1;
    //find duplicate character in slots
    for(let i = 0; i < characterSlots.length; i++)
    {
        if(characterSlots[i]!=null && characterSlots[i]==classname)
        {
            charPos = i;
            break;
        }
    }
    //if duplicate, then get stats and exit
    if(charPos != -1)
    {
        SD_GlobalSpellCast(`${classname.substring(0,1)}!stats`);
        return;
    }
    //find empty space to fill
    for(let i = 0; i < characterSlots.length; i++)
    {
        if(characterSlots[i]==null || characterSlots[i]=="")
        {
            charPos = i;
            break;
        }
    }
    //if no empty space, then exit
    if(charPos == -1)
        return;
    //otherwise, join
    isShortcut(classname)? TwitchWebSocket_SendQueue(`${classname.substring(0,1)}!${classname.substring(0,1)}`) : TwitchWebSocket_SendQueue(`!${classname}`);
    ToggleShortcut(classname);
    characterSlots[charPos] = classname;
    divsSlotToggleButtons[charPos].innerHTML = classname;
}

function SD_Vote(votenum)
{
    isShortcut("vote")? TwitchWebSocket_SendQueue(`!v${votenum}`) : TwitchWebSocket_SendQueue(`!vote${votenum}`);
    ToggleShortcut("vote");
}

function SD_Tower(towernum)
{
    MultiselectCommandBuilder(isShortcut("tower")? `!${towernum}` : `!tower${towernum}`);
    ToggleShortcut("tower");
}

function SD_Power(powermode)
{
    switch(powermode)
    {
        case "up":
            MultiselectCommandBuilder(isShortcut("powerup")? "!p" : "!powerup");
            ToggleShortcut("powerup");
            break;
        case "down":
            MultiselectCommandBuilder(isShortcut("powerdown")? "!pd" : "!powerdown");
            ToggleShortcut("powerdown");
            break;
        case "lock":
            MultiselectCommandBuilder(isShortcut("powerlock")? "!pl" : "!powerlock");
            ToggleShortcut("powerlock");
            break;
    }
}

function SD_Train()
{
    MultiselectCommandBuilder(isShortcut("train")? "!t" : "!train");
    ToggleShortcut("train");
}

function SD_Altar()
{
    MultiselectCommandBuilder(isShortcut("altar")? "!a" : "!altar");
    ToggleShortcut("altar");
}

function SD_AwakeAFK()
{
    isShortcut("awake")? TwitchWebSocket_SendQueue("! !") : TwitchWebSocket_SendQueue("!");
    ToggleShortcut("awake");
}

function SD_Leave()
{
    MultiselectCommandBuilder("!leave");
}

function MultiselectCommandBuilder(command)
{
    const isLeave = (command=="!leave");
    if(selectionMode == -1)//ALL
    {
        if(isLeave)
        {
            if(isShortcut("leave"))
                command += " !";
            ToggleShortcut("leave");
            for(let i = 0; i < characterSlots.length; i++)
            {
                characterSlots[i] = "";
                divsSlotToggleButtons[i].innerHTML = `Slot ${i+1}`;
            }
        }
        TwitchWebSocket_SendQueue(command);
    }
    else if(selectionMode == 0)//SINGLE
    {
        if(isLeave)
        {
            if(isShortcut("leave"))
                command += " !";
            ToggleShortcut("leave");
        }
        TwitchWebSocket_SendQueue(`${characterSlots[singleSlot].substring(0,1)}${command}`);
        if(isLeave)
        {
            characterSlots[singleSlot] = "";
            divsSlotToggleButtons[singleSlot].innerHTML = `Slot ${singleSlot+1}`;
        }
    }
    else if(selectionMode==1 || selectionMode == 2)//TEAM
    {
        const team = [];
        for(let i=0; i<4; i++)
        {
            if(((selectionMode==1 && toggledTeam1[i]) || (selectionMode==2 && toggledTeam2[i])) && (characterSlots[i]!=null && characterSlots[i]!=""))
                team.push(characterSlots[i]);
        }
        if(team.length > 0)
        {
            let multiCommand = `${team[0].substring(0,1)}${command}`;
            for(let i=1; i<team.length; i++)
                multiCommand += ` ${team[i].substring(0,1)}${command}`;
            if(isLeave)
            {
                if(isShortcut("leave"))
                    multiCommand += " !";
                ToggleShortcut("leave");
                for(let i=0; i<4; i++)
                {
                    if((selectionMode==1 && toggledTeam1[i]) || (selectionMode==2 && toggledTeam2[i]))
                    {
                        characterSlots[i] = "";
                        divsSlotToggleButtons[i].innerHTML = `Slot ${i+1}`;
                    }
                }
            }
            TwitchWebSocket_SendQueue(multiCommand);
        }
    }
}

function SD_GlobalSpellCast(command)
{
    isShortcut("spell")? TwitchWebSocket_SendQueue(`${command} !`) : TwitchWebSocket_SendQueue(`${command}`);
    ToggleShortcut("spell");
}

function SD_MultiSpellCast(command)
{
    const towernums = [];
    for(let i=0; i<toggledTowers.length; i++)
    {
        if(toggledTowers[i])
            towernums.push(i+1);
    }
    if(towernums.length < 1)
    {
        SD_GlobalSpellCast(command);
    }
    else
    {
        let multiCommand = "";
        for(let i=0; i<towernums.length; i++)
            i<towernums.length-1? multiCommand+=`${command}${towernums[i]} ` : multiCommand+=`${command}${towernums[i]}`;
        if(multiCommand.length > 0)
            SD_GlobalSpellCast(multiCommand);
    }
}

const targetSorters =
[
    {name: "front", shortcut: "f", isShortcut: false},
    {name: "back", shortcut: "b", isShortcut: false},
    {name: "closest", shortcut: "c", isShortcut: false},
    {name: "farthest", shortcut: "f", isShortcut: false},
    {name: "leasthealth", shortcut: "l", isShortcut: false},
    {name: "mosthealth", shortcut: "h", isShortcut: false},
    {name: "leastmaxhealth", shortcut: "x", isShortcut: false},
    {name: "mostmaxhealth", shortcut: "m", isShortcut: false},
    {name: "leastarmor", shortcut: "t", isShortcut: false},
    {name: "mostarmor", shortcut: "a", isShortcut: false},
    {name: "aoe", shortcut: "o", isShortcut: false},
    {name: "quickest", shortcut: "q", isShortcut: false},
    {name: "slowest", shortcut: "s", isShortcut: false}
]

const targetFilters =
[
    {name: "armored", shortcut: "a", isShortcut: false, isToggled: false, htmlToggleButton: document.getElementById("tglFilterBtn0")},
    {name: "belowhalf", shortcut: "h", isShortcut: false, isToggled: false, htmlToggleButton: document.getElementById("tglFilterBtn1")},
    {name: "boss", shortcut: "b", isShortcut: false, isToggled: false, htmlToggleButton: document.getElementById("tglFilterBtn2")},
    {name: "burning", shortcut: "g", isShortcut: false, isToggled: false, htmlToggleButton: document.getElementById("tglFilterBtn3")},
    {name: "challenge", shortcut: "c", isShortcut: false, isToggled: false, htmlToggleButton: document.getElementById("tglFilterBtn4")},
    {name: "charmable", shortcut: "r", isShortcut: false, isToggled: false, htmlToggleButton: document.getElementById("tglFilterBtn5")},
    {name: "multiple", shortcut: "m", isShortcut: false, isToggled: false, htmlToggleButton: document.getElementById("tglFilterBtn6")},
    {name: "notboss", shortcut: "o", isShortcut: false, isToggled: false, htmlToggleButton: document.getElementById("tglFilterBtn7")},
    {name: "notmarked", shortcut: "x", isShortcut: false, isToggled: false, htmlToggleButton: document.getElementById("tglFilterBtn8")},
    {name: "spawned", shortcut: "p", isShortcut: false, isToggled: false, htmlToggleButton: document.getElementById("tglFilterBtn9")},
    {name: "oneshot", shortcut: "1", isShortcut: false, isToggled: false, htmlToggleButton: document.getElementById("tglFilterBtn10")},
    {name: "slowable", shortcut: "l", isShortcut: false, isToggled: false, htmlToggleButton: document.getElementById("tglFilterBtn11")},
    {name: "stackable", shortcut: "t", isShortcut: false, isToggled: false, htmlToggleButton: document.getElementById("tglFilterBtn12")},
    {name: "structure", shortcut: "s", isShortcut: false, isToggled: false, htmlToggleButton: document.getElementById("tglFilterBtn13")},
    {name: "stunnable", shortcut: "e", isShortcut: false, isToggled: false, htmlToggleButton: document.getElementById("tglFilterBtn14")},
    {name: "stunned", shortcut: "d", isShortcut: false, isToggled: false, htmlToggleButton: document.getElementById("tglFilterBtn15")},
    {name: "summoned", shortcut: "u", isShortcut: false, isToggled: false, htmlToggleButton: document.getElementById("tglFilterBtn16")},
    {name: "unarmored", shortcut: "n", isShortcut: false, isToggled: false, htmlToggleButton: document.getElementById("tglFilterBtn17")},
    {name: "weak", shortcut: "w", isShortcut: false, isToggled: false, htmlToggleButton: document.getElementById("tglFilterBtn18")},
    {name: "target", shortcut: "v", isShortcut: false, isToggled: false, htmlToggleButton: document.getElementById("tglFilterBtn19")}
]

function ToggleFiltering(filter)
{
    if(filter<0 || filter>=targetFilters.length)
        return;

    if(targetFilters[filter].isToggled)
    {
        targetFilters[filter].htmlToggleButton.classList.remove("sdToggleOn");
        targetFilters[filter].htmlToggleButton.classList.add("sdToggleOff");
    }
    else
    {
        targetFilters[filter].htmlToggleButton.classList.remove("sdToggleOff");
        targetFilters[filter].htmlToggleButton.classList.add("sdToggleOn");
    }
    targetFilters[filter].isToggled = !targetFilters[filter].isToggled;
}

function SD_Targeting(sorting)
{
    let sortingCommand = targetSorters[sorting].isShortcut? `!tars=${targetSorters[sorting].shortcut}` : `!tars=${targetSorters[sorting].name}`;
    targetSorters[sorting].isShortcut = !targetSorters[sorting].isShortcut;
    let filterList = [];
    for(let i=0; i<targetFilters.length; i++)
    {
        if(targetFilters[i].isToggled)
        {
            filterList.push(targetFilters[i].isShortcut? targetFilters[i].shortcut : targetFilters[i].name);
            targetFilters[i].isShortcut = !targetFilters[i].isShortcut;
        }
    }
        
    let filterCommand = null;
    if(filterList.length > 0)
    {
        filterCommand = "!tarp=";
        for(let i=0; i<filterList.length; i++)
            i<filterList.length-1? filterCommand+=`${filterList[i]},` : filterCommand+=filterList[i];
    }
    else
    {
        filterCommand = "!tarp--";
    }
    TwitchWebSocket_SendQueue(`${sortingCommand} ${filterCommand}`);
}

/*
Talent Special
!sp

!gold
!faction
!jointemplar
!joinelementals
!joinmagiorder
!joinwolfclan

!essence
a!essence
r!essence
f!essence
t!essence
p!essence
b!essence

a!stats
r!stats
f!stats
t!stats
p!stats
b!stats

!specs

!specbowman
!talpiercing
!talfalcon
!specsniper
!talvulture
!talweaken
!specgunner
!talgunslinger
!talrockets

!specknifethrower
!talbounce
!talaxe
!specassassin
!talcharge
!talpoisonstrike
!specninja
!taldeadly
!talspread

!specpyromancer
!talmaniac
!talignite
!specarcanist
!talhaste
!taloverdrive
!specsaboteur
!talbomber
!talbarrage

!specicemage
!talchilling
!talfreezing
!spectrickster
!talcharming
!talcharisma
!speclightningmage
!talstunning
!talchain

!specplaguedoctor
!talelixir
!talnecromancer
!specundeadarcher
!taldoublebow
!talraise
!specdeathdealer
!talempowered
!talseed

!specminstrel
!talamplify
!talmimic
!speccommander
!talbooming
!talquickdraw
!specscout
!talintel
!talrupture


!tarinfo
!tars=front (f)
!tars=back (b)
!tars=closest (c)
!tars=farthest (r)
!tars=leasthealth (l)
!tars=mosthealth (h)
!tars=leastmaxhealth (x)
!tars=mostmaxhealth (m)
!tars=leastarmor (t)
!tars=mostarmor (a)
!tars=aoe (o)
!tars=quickest (q)
!tars=slowest (s)

!tarp–
!tarp=<priority1,priority2,priority2>
armored (a)
belowhalf (h)
boss (b)
burning (g)
challenge (c)
charmable (r)
multiple (m)
notboss (o)
notmarked (x)
spawned (p)
oneshot (1)
slowable (l)
stackable (t)
structure (s)
stunnable (e)
stunned (d)
summoned (u)
unarmored (n)
weak (w)
target (v)
*/