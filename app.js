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
const htmlChatMessageDivs = [];
for(let i = 0; i < maxChatMessages; i++)
    htmlChatMessageDivs.push({div:document.getElementById(`divChatMessage${i}`), parsedSMS:{rawData:">", count:-1, type:"NONE", sender:"", sms:">"}});
const htmlTowerToggle = [];
for(let i = 1; i <= 12; i++)
    htmlTowerToggle.push(document.getElementById(`tglTower${i}`));

const htmlTabButtons =
[
    document.getElementById("btnCharactersTab"),
    document.getElementById("btnSpellsTab"),
    document.getElementById("btnSpecsTab")
];
const htmlTabPanels =
[
    document.getElementById("divCharactersTab"),
    document.getElementById("divSpellsTab"),
    document.getElementById("divSpecsTab")
];

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
    GetFormTwitchData();
    if(tChannel==null || tChannel=="")
    {
        TwitchWebSocket_Recieve({data:`:CIC Studios!CIC Studios@CIC Studios.tmi.twitch.tv PRIVMSG #${tChannel.replace("#", "")} :Missing Channel Name. Please enter the name of the twitch channel you wish to connect to.\r\n`});
        return;
    }
    if(oAuth==null || oAuth=="")
    {
        TwitchWebSocket_Recieve({data:`:CIC Studios!CIC Studios@CIC Studios.tmi.twitch.tv PRIVMSG #${tChannel.replace("#", "")} :Missing Twitch OAuth (You must get this from https://twitchapps.com/tmi/). You can find a link in the button below.\r\n`});
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

    for(let i=19; i>0; i--)
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

function TwitchWebSocket_Send(message)
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
const divChatMessage = document.getElementById("inputSendChatMessage");
function ChatMessage_Send()
{
    TwitchWebSocket_Send(divChatMessage.value);
    divChatMessage.value = "";
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
    //if duplicate, then exit
    if(charPos != -1)
        return;
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
    isShortcut(classname)? TwitchWebSocket_Send(`${classname.substring(0,1)}!${classname.substring(0,1)}`) : TwitchWebSocket_Send(`!${classname}`);
    ToggleShortcut(classname);
    characterSlots[charPos] = classname;
    divsSlotToggleButtons[charPos].innerHTML = classname;
}

function SD_Vote(votenum)
{
    isShortcut("vote")? TwitchWebSocket_Send(`!v${votenum}`) : TwitchWebSocket_Send(`!vote${votenum}`);
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
    isShortcut("awake")? TwitchWebSocket_Send("!") : TwitchWebSocket_Send("!awake");
    ToggleShortcut("awake");
}

function SD_Leave()
{
    MultiselectCommandBuilder("!leave");
}

function MultiselectCommandBuilder(command)
{
    if(selectionMode == -1)
        TwitchWebSocket_Send(command);
    else if(selectionMode == 0)
        TwitchWebSocket_Send(`${characterSlots[singleSlot].substring(0,1)}${command}`);
    else if(selectionMode==1 || selectionMode == 2)
    {
        const team = [];
        for(let i = 0; i < 4; i++)
        {
            if(selectionMode==1 && toggledTeam1[i])
                team.push(characterSlots[i]);
            else if(selectionMode==2 && toggledTeam2[i])
                team.push(characterSlots[i]);
        }
        if(team.length > 0)
        {
            let multiCommand = `${team[0].substring(0,1)}${command}`;
            for(let i=1; i<team.length; i++)
                multiCommand += ` ${team[i].substring(0,1)}${command}`;
            if(command=="!leave")
            {
                if(isShortcut("leave"))
                    multiCommand += " !";
                ToggleShortcut("leave");
            }
            TwitchWebSocket_Send(multiCommand);
        }
    }
}

function SD_GlobalSpellCast(command)
{
    isShortcut("spell")? TwitchWebSocket_Send(`${command} !`) : TwitchWebSocket_Send(`${command}`);
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