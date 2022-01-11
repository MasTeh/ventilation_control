
$(document)

    .on('click', '[onPress]', function() {

        eval($(this).attr('onPress'));

    })

    .on('change', '[onChange]', function() {

        eval($(this).attr('onChange'));

    })


    .on('click', '.editable_graphic_indicator', (e) => {

        let gid = $(e.path[1]).attr('gid');

        if (!gid) {
            app.dialog.alert("Ошибка. GID не определился");
            return false;
        }

        myapp.cache.register_ui_id = gid;

        let template = myapp.popupTemplates.graphicRegister;
        let imagesSection = graphIndicators[myapp.activeSection];
        let images = imagesSection[gid];
        let lastIP = window.localStorage.getItem("lastIP") || '';
        let lastPort = window.localStorage.getItem("lastPort") || '';


        app.popup.open(myapp.compileTemplate(template, images));

        $('.graphic-register-popup').find('input:not(.hidden)').val('');
        $('.graphic-register-popup').find('input[name=ipaddr]').val(lastIP);
        $('.graphic-register-popup').find('input[name=port]').val(lastPort);

        let register = myapp.registers[gid];
        let imagesValues = (register.values).split(',');
        let imageIndex = 0;
        let data = {ipaddr: register.ip, size: register.size, number: register.number, port: register.port};
        app.form.fillFromData('#registerForm', data);

        $('.gra-label').html(`GRA ${register.ip}:${register.port}:${register.number}:${register.size}`);

        for (let imageCode in imagesValues) {
            $('.graphic-register-popup').find(`input[name='value.${imageIndex}']`).val(imagesValues[imageCode]);
            imageIndex++;
        }


    })

    .on('click', '.setter-edit', (e) => {

        let index = $(e.path[1]).attr('setter-num');

        let setterData = setters.activeSetters[index];

        setters.openSetterPopup(setterData, index);
    })

    .on('click', '.setter-button-minus', (e) => {

        let index = $(e.path[0]).attr('setter-index');

        let setterData = setters.activeSetters[index];
        let value = parseFloat(setterData.graValue) - parseFloat(setterData.step);
        let delay = Number((setterData.delay || 3000)) + 1000;

        $(e.path[0]).parent().addClass('disabled');

        myapp.apiQuery('/api/setters/change', {setter: JSON.stringify(setterData), value: value, client_id: myapp.user_id})
            .then((response) => {

                if (response.status === 'error') {
                    app.dialog.alert(response.error, "Что-то пошло не так");
                    $(e.path[0]).parent().removeClass('disabled');
                    return false;
                }

                setTimeout(() => {
                    $(e.path[0]).parent().removeClass('disabled');
                }, delay);
            });


    })

    .on('click', '.setter-remove', (e) => {

        let index = $(e.path[1]).attr('setter-num');



        app.dialog.confirm("Удалить уставку?", "", () => {
            myapp.apiQuery('/api/setters/remove', {
                client_id: myapp.user_id,
                section: myapp.activeSection,
                index: index
            }).then(() => {
                app.popup.close();
                setters.loadSetters();
            });
        });
    })

    .on('click', '.setter-button-plus', (e) => {



        let index = $(e.path[0]).attr('setter-index');
        let setterData = setters.activeSetters[index];
        let value = parseFloat(setterData.graValue) + parseFloat(setterData.step);
        let delay = Number((setterData.delay || 3000)) + 1000;

        $(e.path[0]).parent().addClass('disabled');


        myapp.apiQuery('/api/setters/change', {setter: JSON.stringify(setterData), value: value, client_id: myapp.user_id})
            .then((response) => {

                if (response.status === 'error') {
                    app.dialog.alert(response.error, "Что-то пошло не так");
                    $(e.path[0]).parent().removeClass('disabled');
                    return false;
                }

                setTimeout(() => {
                    $(e.path[0]).parent().removeClass('disabled');
                }, delay);
            });

    })

    .on('change', '.setter-input-number', (e) => {



        let index = $(e.path[0]).attr('setter-index');
        let setterData = setters.activeSetters[index];
        let value = parseFloat($(e.path[0]).val());
        let delay = Number((setterData.delay || 3000)) + 1000;

        $(e.path[0]).parent().addClass('disabled');


        myapp.apiQuery('/api/setters/change', {setter: JSON.stringify(setterData), value: value, client_id: myapp.user_id})
            .then((response) => {

                if (response.status === 'error') {
                    app.dialog.alert(response.error, "Что-то пошло не так");
                    $(e.path[0]).parent().removeClass('disabled');
                    return false;
                }

                setTimeout(() => {
                    $(e.path[0]).parent().removeClass('disabled');
                }, delay);
            });

    })

    .on('change', '.setter-switcher-change', (e) => {



        let index = $(e.path[0]).attr('setter-index');
        let setterData = setters.activeSetters[index];
        let value = $(e.path[0]).val();
        let delay = Number((setterData.delay || 3000)) + 1000;

        if (value === '---') return false;


        $(e.path[0]).parent().addClass('disabled');


        myapp.apiQuery('/api/setters/change', {setter: JSON.stringify(setterData), value: value, client_id: myapp.user_id})
            .then((response) => {
                if (response.status === 'error') {
                    app.dialog.alert(response.error, "Что-то пошло не так");
                    $(e.path[0]).parent().removeClass('disabled');
                    return false;
                }

                setTimeout(() => {
                    $(e.path[0]).parent().removeClass('disabled');
                }, delay);

            });

    })

    .on('click', '.button-coil-push', (e) => {

        let index = $(e.path[0]).attr('setter-num');
        let setterData = setters.activeSetters[index];
        let delay = Number((setterData.delay || 3000)) + 1000;

        $(e.path[0]).parent().addClass('disabled');

        let onTimeoutError = () => {
            $(e.path[0]).parent().removeClass('disabled');
            app.dialog.alert("Ошибка выполнения запроса. Сервер либо не ответил, либо там произошла ошибка при обработке.", "Ошибка");
        };

        myapp.apiQuery('/api/setters/pushimpulse', {setter: JSON.stringify(setterData), client_id: myapp.user_id}, 30000, onTimeoutError)
            .then((response) => {

                if (response.status === 'error') {
                    app.dialog.alert(response.error, "Что-то пошло не так");
                    $(e.path[0]).parent().removeClass('disabled');
                    return false;
                }

                setTimeout(() => {
                    $(e.path[0]).parent().removeClass('disabled');
                }, delay);
            });

    })

    .on('change', 'select[name=setter_ui_type]', (ev) => {
        if ($('select[name=setter_ui_type]').val() === 'setter') {
            $('.elem-header').hide();
            $('.elem-setter').show();
        }

        if ($('select[name=setter_ui_type]').val() === 'header') {
            $('.elem-header').show();
            $('.elem-setter').hide();
        }
    })

    .on('change', '.setter-type-trigger', (ev) => {
        if ($('.setter-type-trigger').val() === 'switcher') {
            $('.options_block').show();

        } else {
            $('.options_block').hide();
        }
    })


;
