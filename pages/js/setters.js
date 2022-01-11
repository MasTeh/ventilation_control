
class Setters {

    activeSetters = [];


    constructor() {

    }

    readRegistersValues() {
        for (let i in this.activeSetters) {
            let activeSetter = this.activeSetters[i];

            if (activeSetter.setter_ui_type === 'setter') {
                this.getGRA_value(activeSetter, i);
            }

        }
    }

    readRegistersTimer() {
        try {

            this.readRegistersValues();

        } catch (err) {
            console.log(err);
        } finally {
            setTimeout(() => {
                this.readRegistersTimer();
            }, 3000);
        }


    }

    async getGRA_value(setter, index) {

        let response = await myapp.apiQuery('/api/gra/read', {gra: setter.gra});

        if (response.status === "ok") {
            try {
                let value = response.value.value;
                let result = response.value.result;


                if (setter.type === "float") {
                    if (result === 'error') {
                        value = `---`;

                        $(`.stepper-input-${setter.number}`).parent().find('.error-msg').html('').hide();
                        if (result === 'error') {
                            $(`.stepper-input-${setter.number}`).parent().find('.error-msg').html(response.value.error).show();
                            return  false;
                        }

                    } else {
                        value = (value).toFixed(1);
                    }
                }
                if (setter.type === "int") {
                    if (result === 'error') {
                        value = `---`;

                        $(`.stepper-input-${setter.number}`).parent().find('.error-msg').html('').hide();
                        if (result === 'error') {
                            $(`.stepper-input-${setter.number}`).parent().find('.error-msg').html(response.value.error).show();
                            return  false;
                        }

                    } else {
                        value = (value).toFixed(0);
                    }
                }

                if (setter.type === "switcher") {
                    if (result === 'error') {
                        value = `<img src="img/error.png" style="width: 20px" class="error-icon" title="${response.value.error}">`;
                    } else {
                        value = (value).toFixed(0);

                        $(`.setter-switcher-${setter.number}`).val(value);
                    }
                }

                if (setter.type === "coil") {


                    $(`.stepper-coil-button-${setter.number}`).parent().find('.error-msg').html('').hide();

                    if (result === 'error') {

                        $(`.stepper-coil-button-${setter.number}`).html('Ошибка');
                        $(`.stepper-coil-button-${setter.number}`).parent().find('.error-msg').html(response.value.error).show();

                        return  false;
                    }


                    //192.168.100.101:502:14394:1

                    value = (Number(value));

                    let startLabel = setter.button_start_name || "Старт";
                    let stopLabel = setter.button_stop_name || "Стоп";
                    let stateStartLabel = setter.label_started || "Запущено";
                    let stateStopLabel = setter.label_stopped || "Остановлено";
                    if (value === 1) {
                        setter.stateLabel = stateStartLabel;
                    } else {
                        setter.stateLabel = stateStopLabel;
                    }

                    if (value === 1) {
                        setter.buttonLabel = stopLabel;
                    } else {
                        setter.buttonLabel = startLabel;
                    }

                    $(`.state-label-${setter.number}`).html(setter.stateLabel);
                    $(`.stepper-coil-button-${setter.number}`).html(setter.buttonLabel);
                }

                if (setter.type === "float" || setter.type === "int") {
                    if (!$(`.stepper-input-${setter.number}`).is(':focus')) {
                        $(`.stepper-input-${setter.number}`).val(value);
                    }
                }

                if (result === 'ok') {
                    this.activeSetters[index].graValue = value;
                }

            } catch (e) {
                console.log(e);
            }
        }
    }

    openSetterPopup(setterData = null, index = null) {
        app.popup.open(myapp.popupTemplates.addSetter);


        let lastIP = window.localStorage.getItem("lastIP") || '';
        let lastPort = window.localStorage.getItem("lastPort") || '';

        $('#addSetterForm').find('input[name=ipaddr]').val(lastIP);
        $('#addSetterForm').find('input[name=port]').val(lastPort);

        if (setterData) {
            if (setterData.switcherJSON != null) {
                let json = setterData.switcherJSON;

                let jsontext = "";
                for (let key in json) {
                    jsontext += `${key}:${json[key]}\n`;
                }
                jsontext = jsontext.substr(0, (jsontext.length - 1));
                setterData.switcher_options = jsontext;
            }

            app.form.fillFromData('#addSetterForm', setterData);

        } else {
            $('#addSetterForm').find('input[name=ordernum]').val(myapp.maxOrderNum + 1);
        }

        if (index) {
            $('#addSetterForm').find('input[name=update_index]').val(index);
        }
    }

    async saveSetter() {
        let data = app.form.convertToData('#addSetterForm');

        if (Number(data.number) < 0 || Number(data.number) > 65535) {
            app.dialog.alert('Номер регистра должен быть в диапазоне от 0 до 65535');
            return false;
        }
        let isSetter = true;

        if (data.setter_ui_type === 'header') isSetter = false;

        let switcherJSON = null;
        if (data.type === 'switcher' && isSetter) {
            if (data.switcher_options === '') {
                app.dialog.alert("А кто будет указывать опции???", "Не понял");
                return false;
            } else {
                let strings = (data.switcher_options).split(/\n/);
                let json = {};
                for (let i in strings) {
                    let values = (strings[i]).split(':');
                    json[ values[0] ] = values[1];
                }
                if (window.confirm("Правильно считан массив? \n "+print_r(json))) {
                    switcherJSON = json;
                }
                else {
                    return false;
                }
            }
        }

        data.switcherJSON = switcherJSON;

        if (isSetter) {
            let valid = $('#addSetterForm')[0].checkValidity();
            if (!valid) return false;

            data.gra = (data.gra).replace(" ", "");
            data.gra = (data.gra).replace("GRA", "");

            let graSplit = (data.gra).split(':');

            if (graSplit.length === 2) {
                data.gra = `${data.ipaddr}:${data.port}:${data.gra}`;
            }

        } else {
            if (data.header === '') {
                app.dialog.alert('Заголок то где?', 'Ну вот опять');
                return false;
            }
        }


        console.log(data);

        let updateIndex = data.update_index;

        let response;
        if (updateIndex == "null") {
            response = await myapp.apiQuery('/api/setters/add',
                {
                    client_id: myapp.user_id,
                    section: myapp.activeSection,
                    setter: JSON.stringify(data)
                });
        } else {
            response = await myapp.apiQuery('/api/setters/update',
                {
                    client_id: myapp.user_id,
                    section: myapp.activeSection,
                    setter: JSON.stringify(data),
                    index: updateIndex
                });
        }

        if (response.status === "ok") {

            app.popup.close();
            this.loadSetters();

        } else if (response.status === "error") {
            alert(`Ошибка. ${response.error}`);
            //app.dialog.alert(`Ошибка. ${response.error}`);
        }
    }

    async loadSetters() {

        let response = await myapp.apiQuery('/api/setters/getlist',
            {
                client_id: myapp.user_id,
                section: myapp.activeSection
            });

        if (response.status === 'ok') {
            this.activeSetters = response.items;

            let columns = {};

            for (let i in response.items) {
                let item = response.items[i];
                if (!columns[item.column]) columns[item.column] = [];
                columns[item.column].push(item);
            }

            let column_count = 0;
            let max_ordernum = 0;
            for (let i in columns) {
                column_count++;

                columns[i].sort((a,b) => {
                    return (a.ordernum - b.ordernum);
                });

            }

            let columnWidth = '400px';
            let columnZoom = 0.9;
            if (column_count === 2){
                columnWidth = '350px';
                columnZoom = 0.8;
            }
            if (column_count === 3) {
                columnWidth = '340px';
                columnZoom = 0.75;
            }

            if (column_count === 4) {
                columnWidth = '340px';
                columnZoom = 0.6;
            }

            $('#setters-zone').html('');

            let settersHtml = '';

            for (let i in columns) {

                let columnHtml = `<div class="setters-section" style="width: ${columnWidth}; zoom: ${columnZoom}">`;

                let items = columns[i];
                for (let i in items) {
                    let item = items[i];

                    max_ordernum++;

                    let usingTemplate;
                    if (item.type === "float" || item.type === "int") usingTemplate = myapp.setterTemplates.number;
                    if (item.type === "coil") usingTemplate = myapp.setterTemplates.coil;
                    if (item.type === "switcher") {
                        usingTemplate = myapp.setterTemplates.list;

                    }

                    if (item.setter_ui_type === "header") {
                        usingTemplate = myapp.setterTemplates.header;
                    }

                    let compileTemplate = Template7.compile(usingTemplate);
                    let itemHtml = compileTemplate(item);

                    columnHtml += itemHtml;


                    setTimeout(() => {
                        app.stepper.create({
                            el: `.stepper-${item.number}`
                        });
                    }, 500);

                }

                columnHtml += '</div>';

                settersHtml += columnHtml;

            }

            $('#setters-zone').html(settersHtml);
            if (myapp.editMode) $('.setter-edit-elem').show();

            myapp.maxOrderNum = max_ordernum;

            this.readRegistersValues();

        }
    }



}
