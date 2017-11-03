import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
const uuidv4 = require('uuid/v4');


const INFOCASTER_API_BASE_URL = 'https://infocaster.lcc.infomaker.io/v1';
class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      clientId: uuidv4(),
      sound: true,
      text: '',
      lang: 'sv-SE',
      validLangs: [
        {
          flag: '🇩🇪',
          displayName: 'German',
          code: 'de-DE'
        },
        {
          flag: '🇩🇰',
          displayName: 'Danish',
          code: 'da-DK'
        },
        {
          flag: '🇺🇸',
          displayName: 'English',
          code: 'en-US'
        },
        {
          flag: '🇬🇧',
          displayName: 'English',
          code: 'en-GB'
        },
        {
          flag: '🇪🇸',
          displayName: 'Spanish',
          code: 'es-ES'
        },
        {
          flag: '🇫🇮',
          displayName: 'Finnish',
          code: 'fi-FI'
        },
        {
          flag: '🇫🇷',
          displayName: 'French',
          code: 'fr-FR'
        },
        {
          flag: '🇳🇴',
          displayName: 'Norwegian',
          code: 'nb-NO'
        },
        {
          flag: '🇷🇺',
          displayName: 'Russian',
          code: 'ru-RU'
        },
        {
          flag: '🇸🇪',
          displayName: 'Swedish',
          code: 'sv-SE'
        },
      ],
      infocasterSessionUrl: `${INFOCASTER_API_BASE_URL}/publisher/open/session`
    };
  }

  componentDidMount() {
    this.connect();
  }

  render() {
    return (
      <div className='App'>
        <input className='textInput' placeholder='Input the stuff. ✌' value={this.state.text}
          onChange={this.handleInputChange.bind(this)}
          onKeyPress={this.handleInputKeypress.bind(this)} />
        <select className='selectLang' onChange={this.handleSelectLangChange.bind(this)} value={this.state.lang} name='selectLang'>
          {this.state.validLangs.sort((x, y)=> x.displayName > y.displayName).map(item => {
            return <option value={item.code}> {item.flag} {item.displayName}</option>
          }) }
        </select>
        <div className='soundCheckbox'>
          <input type='checkbox' id='soundCheckbox' className='soundCheckbox' name='sound' onChange={this.handleSoundCheckboxChange.bind(this)} checked={this.state.sound} />
          <label for='soundCheckbox'>Speak on my device</label>
        </div>
        <pre className='commandPre'>{
`curl -X POST -H "Content-Type: application/json" -d '
  {
    "text":"xyz",
    "lang":"en-US"
  }' ${INFOCASTER_API_BASE_URL}/publisher/open/broadcast/speak-xxx/publish`
}</pre>
      <span className='poweredBy'>Powered by <strong>Infomaker LCC</strong></span>
      </div>
    );
  }

  subscribe(){
    fetch(`${INFOCASTER_API_BASE_URL}/instance/${this.state.destination.instanceId}/v1/publisher/open/broadcast/speak-xxx/subscribe`,
    {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        mode: 'no-cors',
        method: 'POST',
        body: JSON.stringify({
          sessionId: this.state.destination.sessionId,
          sessionSecret: this.state.sessionSecret,
          sendConfirmationToSession: true,
          filters: [
            {}
          ]
        })
    })
    .then(function(res){ console.log('subscribe success', res) })
    .catch(function(res){ console.log('subscribe failure', res) })
   }


  connect() {
    if(!this.state.connected){
      this.source = new EventSource(this.state.infocasterSessionUrl);
      this.source.onmessage = (e) => {
        console.log(e.data)

        let parsedData = JSON.parse(e.data);

        if(parsedData.type === 'sessionInit'){
          this.setState({
            webhookUrl : parsedData.data.webhookUrl,
            sessionSecret : parsedData.data.sessionSecret,
            destination : parsedData.data.destination
          });
          this.subscribe();
        } else if(parsedData.type === 'broadcastPublish'){
          if(parsedData.data && parsedData.data.payload) {
            const payload = typeof parsedData.data.payload === 'object' ? parsedData.data.payload : JSON.parse(parsedData.data.payload);
            this.handleMessage(payload);
          }
        }
      };


      this.source.onerror = (e) => {
        console.error('EventSource error', e.target.readyState, e, JSON.stringify(e));
        this.setState({
          error : JSON.stringify(e)
        });
      };


      this.source.onopen = (e) => {
        console.info(e);
        this.setState({
          connected : true
        });
      };
    }
  }

  handleMessage(msg) {
    console.log('Received message', msg);
    if(msg.text && msg.lang) {
      console.log("sender", msg);
      if(!this.state.sound || (msg.senderId === this.state.clientId)) return;
      if(window['speechSynthesis']) {
        const u = new SpeechSynthesisUtterance();
        u.text = msg.text;
        u.lang = msg.lang;
        window.speechSynthesis.speak(u);
      }
    }
  }

  sendMessage() {
    fetch(`${INFOCASTER_API_BASE_URL}/publisher/open/broadcast/speak-xxx/publish`,
    {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        mode: 'no-cors',
        method: 'POST',
        body: JSON.stringify({
          senderId: this.state.clientId,
          text: this.state.text,
          lang: this.state.lang
        })
    })
    .then(function(res){ console.log('publish success', res) })
    .catch(function(res){ console.log('publish failure', res) })
  }

  handleInputChange(e) {
    this.setState({
      text: e.target.value
    });
  }

  handleInputKeypress(e) {
    if(e.key === 'Enter') {
      this.sendMessage();
      this.setState({
        text: ''
      });
    }
  }

  handleSelectLangChange(e) {
    this.setState({
      lang: e.target.value
    });
  }

  handleSoundCheckboxChange(e) {
    this.setState({
      sound: e.target.checked
    })
  }
}

export default App;
