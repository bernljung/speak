import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';


const INFOCASTER_API_BASE_URL = 'https://infocaster-stage.lcc.infomaker.io/v1';
class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      text: '',
      lang: 'en-US',
      validLangs: [
        {
          displayName: 'German',
          code: 'de-DE'
        },
        {
          displayName: 'Danish',
          code: 'da-DK'
        },
        {
          displayName: 'American',
          code: 'en-US'
        },
        {
          displayName: 'English',
          code: 'en-GB'
        },
        {
          displayName: 'Spanish',
          code: 'es-ES'
        },
        {
          displayName: 'Finnish',
          code: 'fi-FI'
        },
        {
          displayName: 'French',
          code: 'fr-FR'
        },
        {
          displayName: 'Norwegian',
          code: 'nb-NO'
        },
        {
          displayName: 'Russian',
          code: 'ru-RU'
        },
        {
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
            const parsedPayload = JSON.parse(parsedData.data.payload);
            this.handleMessage(parsedPayload);
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
          text: this.state.text,
          lang: this.state.lang
        })
    })
    .then(function(res){ console.log('publish success', res) })
    .catch(function(res){ console.log('publish failure', res) })
  }

  handleInputChange(e) {
    this.setState({value: e.target.value})
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

  render() {
    return (
      <div className='App'>
        <input className='textInput' placeholder='Input the stuff. ✌' value={this.state.text}
          onChange={this.handleInputChange.bind(this)}
          onKeyPress={this.handleInputKeypress.bind(this)} />
        <select className='selectLang' onChange={this.handleSelectLangChange.bind(this)} name='selectLang'>
          {this.state.validLangs.sort((x, y)=> x.displayName > y.displayName).map(item => {
            return <option value={item.code}>{item.displayName}</option>
          }) }
        </select>
      </div>
    );
  }
}

export default App;
