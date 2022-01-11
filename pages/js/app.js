const $ = Dom7;

const setters = new Setters();
const login = new Login();

const app = new Framework7({
  name: 'VentControl', // App name
  theme: 'auto', // Automatic theme detection
  el: '#app', // App root element

  // App store
  store: store,
  // App routes
  routes: routes,



});

const myapp = {
  init:() => {
    let location = ((window.location.href).split('#'));
    if (location.length > 1) {
      location = location[location.length - 1];
      if (location == undefined) location = myapp.activeSection;
      myapp.activeSection = location;
    }

    myapp.loadSection(myapp.activeSection);

    myapp.registerTimer();
    setters.readRegistersTimer();

    setInterval(() => {
      myapp.checkSystemReloading();
    }, 1000);

    fetch('graphic_register.popup.html')
        .then(async(response) => {
            myapp.popupTemplates.graphicRegister = await response.text();
        });

    fetch('text_register.popup.html')
        .then(async(response) => {
            myapp.popupTemplates.textRegister = await response.text();
        });

    fetch('add_setter.popup.html')
        .then(async(response) => {
          myapp.popupTemplates.addSetter = await response.text();
        });

    fetch('setter_number.template.html')
        .then(async(response) => {
          myapp.setterTemplates.number = await response.text();
        });

    fetch('setter_coil.template.html')
        .then(async(response) => {
          myapp.setterTemplates.coil = await response.text();
        });

    fetch('setter_list.template.html')
        .then(async(response) => {
          myapp.setterTemplates.list = await response.text();
        });

    fetch('setter_header.template.html')
        .then(async(response) => {
          myapp.setterTemplates.header = await response.text();
        });

    fetch('log.template.html')
        .then(async(response) => {
          myapp.logTemplate = await response.text();
        });

  },

  hostname: 'http://'+window.location.hostname,
  //hostname: 'http://localhost',
  //hostname: 'http://192.168.5.10',

  activeSection: 'main',
  activeRegisters: {},
  editMode: false,

  cache: {},

  registers: {},

  popupTemplates: {},

  setterTemplates: {},

  user_id: 0,

  sections: {
    'main':{url: 'main.html'},
    'pvu1':{url: 'pvu.html'},
    'pvu2':{url: 'pvu2.html'},
    'pvu3':{url: 'pvu3.html'},
    'rangehood':{url: 'rangehood.html'},
    'debar':{url: 'debar.html'},
    'vulkan':{url: 'vulkan.html'},
    'server-room':{url: 'server-room.html'},
    'conditioner':{url: 'conditioner.html'},
    'itp':{url: 'itp.html'},
    'counter':{url: 'counter.html'},
    'log':{url: 'log.html'},
  },

  compileTemplate(template, data) {
    let compiledTemplate = Template7.compile(template);
    return compiledTemplate(data);
  },

  loadGraphIndicator(gid) {
    $(`.image-indicator[gid=${gid}]`).html(graphIndicators.getHtml(myapp.activeSection, gid, 0));
    $(`.image-indicator[gid=${gid}]`).addClass('waiting');
  },

  loadGraphIndicatorAll() {
    $('.image-indicator').each((ind) => {
      let gid = $(ind).attr('gid');
      myapp.loadGraphIndicator(gid);
    });
  },

  apiQuery: (query, params, timeout, onTimeOutError) => {
    return new Promise((resolve, reject) => {
      let url_query = '';
      if (params !== undefined) {
        url_query = '?' + new URLSearchParams(params).toString();
      }

      let _timeout = 10000;
      if (timeout != undefined) _timeout = timeout;



      fetchTimeout(myapp.hostname + query + url_query, _timeout)
          .then((response) => {
            if (response.status === 200) {
              resolve(response.json());
            } else {
              reject('404');
            }
          }).catch((err) => {
            // err
            console.log(`Request ${query} aborted`);

            if (onTimeOutError != undefined) onTimeOutError();

          });

    });
  },

  loadSection:(sectionName, afterLoaded) => {
    let url = myapp.sections[sectionName].url;
    app.panel.close();
    app.preloader.show();
    fetch(url).then( async (response) => {
      app.preloader.hide();
      myapp.activeSection = sectionName;
      if (response.status === 200) {
        let html = await response.text();
        $('#section-content').html(html);

        myapp.defaultSectionHandler();
        if (afterLoaded) afterLoaded();

        window.history.pushState(sectionName, sectionName, '#'+sectionName);

      } else {
        $('#section-content').html(response.statusText);
      }
    });
  },

  loadSectionIfNotEdit: (sectionName) => {
    if (!myapp.editMode) {
      myapp.loadSection(sectionName);
    }
  },

  loadRegistersData:() => {
    return new Promise((resolve) => {
      myapp.apiQuery(
          "/api/registers/getall",
          {user_id: myapp.user_id, section: myapp.activeSection}, 1000)
          .then((response) => {
            if (response.status === "ok") {
              let items = response.items;
              for (let ui_id in items) {
                let item = items[ui_id];
                let imageHash = {};
                if (item.type === 'graphic') {
                  let imagesSection = graphIndicators[myapp.activeSection];
                  let selectedItem = imagesSection[ui_id];

                  let imagesList = selectedItem.images;
                  let imageValues = (item.values).split(',');

                  for (let m in imagesList) {
                    let img = imagesList[m];
                    imageHash[ imageValues[m] ] = img;
                  }

                  if (selectedItem.overlayImage) {
                    item.haveOverlay = true;
                    item.overlayImage = selectedItem.overlayImage;
                  } else {
                    item.haveOverlay = false;
                  }
                }
                items[ui_id].imageHash = imageHash;


              }

              myapp.registers = items;

              console.log('Registers set', items);

              resolve();
            }
        });
      });

  },

  async registerTimer() {
    myapp.updateAllRegisters();
    setTimeout(()=> {
      myapp.registerTimer();
    }, 3000);
  },

  defaultSectionHandler:async() => {
    await myapp.loadRegistersData();
    setters.loadSetters();
    myapp.loadGraphIndicatorAll();
    if (myapp.editMode) myapp.setEditableUI();

    setTimeout(() => {
      myapp.updateAllRegisters();
    }, 200);

  },

  logSectionHandler: async(logtype) => {
    let items = await myapp.apiQuery('/api/log', {client_id: myapp.user_id, logtype: logtype});

    $('.log_main_panel').html(myapp.compileTemplate(myapp.logTemplate, items.data));
  },

  loadLogPage: (logtype) => {
    myapp.loadSection('log', () => {
      myapp.logSectionHandler(logtype);
    })
  },

  toggleEditMode() {
    if (!myapp.editMode) {
      myapp.editMode = true;
      $('.edit-toggle-link').addClass('toggle-link-on');
    } else {
      myapp.editMode = false;
      $('.edit-toggle-link').removeClass('toggle-link-on');
    }

    myapp.updateEditableUI();
  },

  updateEditableUI:() => {
    $('.editable-cursor').remove();
    $('.image-indicator').removeClass('editable_graphic_indicator');
    $('.image-indicator').removeClass('editable_graphic_indicator_exist');

    $('.setter-edit-elem').hide();

    $('.overlay-container').show();

    if (myapp.editMode) setTimeout(myapp.setEditableUI, 200);
  },

  setEditableUI:() => {

    $('.overlay-container').hide();

    $('.setter-edit-elem').show();

    $('.indicator').each((item) => {
      let indicatorId = $(item).attr('indicator-id');
      let left = $(item).offset().left;

      let color = "";

      if (myapp.registers[indicatorId] !== undefined) {
        color = "blue";
      } else {
        color = "red";
      }

      let indType = '';

      if ($(item).attr('type') === null) indType = 'number';
      else indType = $(item).attr('type');

      $(item).html(`<div class="editable-cursor" onPress="myapp.indicatorEditDialog('${indicatorId}', '${indType}')" style="background: ${color}"><i class="f7-icons">pencil_ellipsis_rectangle</i></div>`)
    });

    $('.image-indicator').each((item) => {
        let gid = $(item).attr('gid');
        $(item).addClass('editable_graphic_indicator');

        if (myapp.registers[gid]) $(item).addClass('editable_graphic_indicator_exist');
    });
  },

  checkSystemReloading: () => {
    myapp.apiQuery('/api/checkreload', {})
        .then((result) => {
          if (result.state === "reload") {
            $('.system-restart-signal').show();
          } else {
            $('.system-restart-signal').hide();
          }
        })
  },

  indicatorEditDialog: (indicatorId, indicatorType) => {

    app.form.fillFromData('#registerForm', {'type': indicatorType});

    if (!indicatorId) {
      app.dialog.alert("Ошибка. ID поля не определился");
      return false;
    }

    myapp.cache.register_ui_id = indicatorId;

    let lastIP = window.localStorage.getItem("lastIP") || '';
    let lastPort = window.localStorage.getItem("lastPort") || '';


    app.popup.open(myapp.popupTemplates.textRegister);

    if (indicatorType === "switcher") {
      $('.options_block').show();
    } else {
      $('.options_block').remove();
    }

    $('.register-popup').find('input:not(.hidden)').val('');
    $('.register-popup').find('input[name=ipaddr]').val(lastIP);
    $('.register-popup').find('input[name=port]').val(lastPort);

    if (myapp.registers[indicatorId] !== undefined) {
      let register = myapp.registers[indicatorId];
      let data = {title: register.title || "", ipaddr: register.ip, size: register.size, number: register.number, port: register.port, type: indicatorType};

      if (register.switcherJSON != null) {
        let json = JSON.parse(register.switcherJSON);

        let jsontext = "";
        for (let key in json) {
          jsontext += `${key}:${json[key]}\n`;
        }
        jsontext = jsontext.substr(0, (jsontext.length - 1));
        data.switcher_options = jsontext;
      }

      $('.gra-label').html(`GRA ${register.ip}:${register.port}:${register.number}:${register.size}`);

      app.form.fillFromData('#registerForm', data);
    }
  },

  removeRegister: async () => {

    let response = await myapp.apiQuery('/api/registers/remove', {
      user_id: myapp.user_id,
      section: myapp.activeSection,
      ui_id: myapp.cache.register_ui_id,
    });

    if (response.status === "ok") {

      app.popup.close();
      await myapp.loadRegistersData();
      myapp.updateEditableUI();

    } else if (response.status === "error") {
      app.dialog.alert(`Ошибка. ${response.error}`);
    }

  },

  updateRegisterValue: async(registerId , onTimeOut) => {

    if (myapp.editMode) return  false;


    return await myapp.apiQuery('/api/registers/read',
        {section_name: myapp.activeSection, client_id: myapp.user_id, register_id: registerId}, 1000, onTimeOut);

  },

  updateAllRegisters: async() => {
    if (myapp.editMode) return false;

    let registersList = [];
    for (let registerId in myapp.registers) {
      registersList.push(registerId);
    }

    let registersServerData = await myapp.apiQuery(
        '/api/registers/read/list',
        {
          section_name: myapp.activeSection,
          client_id: myapp.user_id,
          registers: registersList.join(',')
        }, 2000);



    let onTimeout = (registerId) => {
      //console.log('ontimeout');
      //$(`.indicator[indicator-id='${registerId}']`).addClass('waiting');
    };


    let timeOffset = 0;
    for (let registerId in registersServerData) {

      let register = myapp.registers[registerId];
      let response = registersServerData[registerId];



      myapp.clearAllErrors();

      if (myapp.editMode) return false;

      $(`.indicator[indicator-id='${registerId}']`).removeClass('waiting');
      if (response.result === 'ok') {

        $('.error-icon').remove();

        if (register.type === 'number') {
          try {
            let htmlInsert = '';
            let value = response.value;
            if (Number(register.size) === 1) value = value.toFixed(0);
            if (Number(register.size) === 8) value = value.toFixed(0);
            if (Number(register.size) === 16) value = value.toFixed(1);


            let leftText = '';

            if (register.title != '' && register.title != undefined) leftText = `<span class="register-left-title">${register.title}: </span>`


            let registerSubtype = $(`.indicator[indicator-id='${registerId}']`).attr('type');

            if (registerSubtype === 'progressbar') {

              htmlInsert = `${leftText}<div class="pvu_schema_main-pic_indicator_fill" title="Значение регистра ${register.number} = ${value}" style="width: ${(value*1.25)}px"></div>`
              //htmlInsert = value*1.25;
            } else {
              htmlInsert = leftText + value;
            }

            $(`.indicator[indicator-id='${registerId}']`).html(htmlInsert);
            $(`.indicator[indicator-id='${registerId}']`).removeClass('waiting');

          } catch (e) {
            console.log(e);
          }
        }

        if (register.type === 'switcher') {
          try {
            let value = (response.value).toFixed(0);

            let switcherOptions = null;
            if (register.switcherJSON != null) {
              switcherOptions = JSON.parse(register.switcherJSON);
            }

            let leftText = '';

            if (register.title != '' && register.title != undefined) leftText = `<span class="register-left-title">${register.title}: </span>`

            if (switcherOptions != null)
              $(`.indicator[indicator-id='${registerId}']`).html(leftText + switcherOptions[value]);
            else {
              let alternative = switcherIndicators.getValue(myapp.activeSection, registerId, value);
              if (alternative !== "not_item") {
                $(`.indicator[indicator-id='${registerId}']`).html(leftText +alternative);
              } else {
                $(`.indicator[indicator-id='${registerId}']`).html(leftText +value);
              }
            }

          } catch (e) {
            //
          }
        }



        if (register.type === 'graphic') {
          try {

            let value = Number(response.value);

            let image = register.imageHash[value];

            if (register.haveOverlay && (value > 0 && value <=100)) {
              let opacity = value/100;

              $(`.image-indicator[gid='${registerId}']`).parent().find('.overlay-container').html(register.overlayImage);
              $(`.image-indicator[gid='${registerId}']`).parent().find('.overlay-container').find('img').css({opacity: opacity});

              image = register.imageHash[0];

              console.log(value);
            }

            if (image === undefined) throw "ImageNotFound";

            let prevImage = $(`.image-indicator[gid='${registerId}']`).find('img').attr('src');

            image = 'img/'+image;

            $(`.image-indicator[gid='${registerId}']`).removeClass('waiting');
            if (image != prevImage) {
              $(`.image-indicator[gid='${registerId}']`).find('img').attr('src', image);
            }

            $(`.image-indicator[gid='${registerId}']`).attr('title', `Значение регистра ${register.number} = ${value}`);



          }
          catch(err) {
            console.log(err);
            if (err === "ImageNotFound") {

              $(`.image-indicator[gid='${registerId}']`).html(
                  `<img src="img/error.png" style="width: 20px" title="Под ответ ${response.value} нет картинки">`
              );

              $(`.image-indicator[gid='${registerId}']`).removeClass('waiting');
            }
          }
        }
      } else if (response.result === 'error') {
        myapp.clearAllErrors();

        let errorText = response.error;
        let displayError = true;

        if (errorText === "not_found") {
          displayError = false;

        } else if (errorText === "Timed out") {
          displayError = false;

          myapp.setIndicatorTimeoutError(register.type, registerId);

        } else if (errorText === "not_connection") {
          errorText = "НЕТ СВЯЗИ по протоколу TCP с сервером регистров";
          displayError = true;
        }

        if (displayError) {
          myapp.setIndicatorError(register.type, registerId, errorText);
        }
      }
    }

  },

  clearAllErrors() {
    $('.error-icon').remove();
    $(`.image-indicator`).removeClass('timeout');
    $(`.indicator`).removeClass('timeout');
  },

  setIndicatorError(registerType, registerId, errorText) {
    if (registerType === 'graphic') {

      setTimeout(() => {
        let imageObj = $(`.image-indicator[gid='${registerId}']`).find('img');
        $(`.image-indicator[gid='${registerId}']`).append(
            `<img src="img/error.png" style="width: 20px" class="error-icon" title="${errorText}">`);
      }, 300);
    } else {
      $(`.indicator[indicator-id="${registerId}"]`).html(`<img src="img/error.png" style="width: 20px" title="${errorText}">`
      );
    }
  },

  setIndicatorTimeoutError(registerType, registerId) {
    setTimeout(() => {
      if (registerType === 'graphic') {
        $(`.image-indicator[gid='${registerId}']`).addClass('timeout');
      } else {
        $(`.indicator[indicator-id="${registerId}"]`).addClass('timeout');
      }
    }, 300);
  },

  registersCount: () => {
    let count = 0;
    for (let i in myapp.registers) {
      count++;
    }
    return count;
  },


  saveRegisterSet: async () => {

    let valid = $('#registerForm')[0].checkValidity();
    if (!valid) {
      console.log("Форма не заполнена");
      return false;
    }

    let data = app.form.convertToData('#registerForm');

    try {

      let type = 'text';
      if (data.type != undefined) type = data.type;

      let values = [];
      if (type === 'graphic') {
        for (let param in data) {
          let value = data[param];

          if (String(param).includes('value.')) {
            values.push(value);
            delete(data[param]);
          }
        }
      }


      if (Number(data.number) < 0 || Number(data.number) > 65535) {
        app.dialog.alert('Номер регистра должен быть в диапазоне от 0 до 65535');
        return false;
      }

      var switcherJSON = null;

      if (data.switcher_options != "" && data.switcher_options != undefined) {
        let strings = (data.switcher_options).split(/\n/);
        let json = {};
        for (let i in strings) {
          let values = (strings[i]).split(':');
          json[ values[0] ] = values[1];
        }
        if (window.confirm("Правильно считан массив? \n "+print_r(json)))
            switcherJSON = json;
        else return  false;
      }



      let response = await myapp.apiQuery('/api/registers/set', {
        title: data.title || "",
        user_id: myapp.user_id,
        section: myapp.activeSection,
        number: data.number,
        size: data.size,
        ipaddr: data.ipaddr,
        port: data.port,
        switcherJSON: JSON.stringify(switcherJSON),
        type: data.type,
        ui_id: myapp.cache.register_ui_id,
        values: values
      });



      window.localStorage.setItem("lastIP", data.ipaddr);
      window.localStorage.setItem("lastPort", data.port);

      if (response.status === "ok") {

        app.popup.close();
        await myapp.loadRegistersData();
        myapp.updateEditableUI();

      } else if (response.status === "error") {
        alert(`Ошибка. ${response.error}`);
        //app.dialog.alert(`Ошибка. ${response.error}`);
      }

    } catch (err) {
      app.dialog.alert(err);
    }

  }

};





login.checkLogined();
