
class Login {
    checker;

    logged = false;
    hash;
    password;

    constructor() {
        this.checker = setInterval(() => {
            if (!this.logged) return false;

            // console.log('check user');
            //
            // let login = window.localStorage.getItem('ventilation_login');
            // let hash = window.localStorage.getItem('ventilation_hash');
            //
            // myapp.apiQuery("/api/checkpassword", {login: login, password:hash, autologin: 1})
            //     .then((response) => {
            //         if (response.result !== 'ok') {
            //             this.logout();
            //         }
            //     });
            //
            // window.localStorage.setItem('ventilation_session_time', (new Date()).getTime());

        }, 15000);
    }

    loginDialog() {
        app.popup.open('.login-screen');

        $('.login-screen').find('input').val('');
    }

    checkLogined() {
        let sessionTime = window.localStorage.getItem('ventilation_session_time');
        if (sessionTime == null) {
            this.loginDialog();
            return false;
        } else {
            sessionTime = Number(sessionTime);
            let time = (new Date().getTime());

            if ((time - sessionTime) > 300) {
                this.checkHash();
            }
        }
    }

    logout() {
        window.localStorage.removeItem('ventilation_login');
        window.localStorage.removeItem('ventilation_hash');
        window.localStorage.removeItem('ventilation_session_time');

        setTimeout(() => {
            location.reload();
        }, 500);
    }

    login() {
        let login = $('.login-screen').find('input[name=login]').val();
        let password = $('.login-screen').find('input[name=password]').val();

        if (login == '' || password == '') return false;

        myapp.apiQuery("/api/checkpassword", {login: login, password:password, autologin: 0})
            .then((response) => {
                console.log(response);
                if (response.result === 'ok') {

                    window.localStorage.setItem('ventilation_login', login);
                    window.localStorage.setItem('ventilation_hash', response.hash);
                    window.localStorage.setItem('ventilation_session_time', (new Date()).getTime());

                    setTimeout(() => {
                        location.reload();
                    }, 500);


                } else if (response.result === 'notfound') {
                    app.dialog.alert("Пользователь не найден", "");
                } else {
                    app.dialog.alert("Логин или пароль неверный", "");

                }
            });
    }

    checkHash() {
        let login = window.localStorage.getItem('ventilation_login');
        let hash = window.localStorage.getItem('ventilation_hash');

        if (login == null || hash == null) this.loginDialog();

        myapp.apiQuery("/api/checkpassword", {login: login, password:hash, autologin: 1})
            .then((response) => {
                console.log(response);

                if (response.result === 'ok') {
                    myapp.user_id = response.user_id;
                    myapp.perms = response.perms;

                    if (response.perms !== 0) {
                        $('.edit-toggle-link').remove();
                    }

                    $('.username').html(login);

                    this.login = login;
                    this.hash = hash;
                    this.logged = true;

                    myapp.init();
                    app.popup.close();
                } else if (response.result === 'notfound') {
                    app.dialog.alert("Пользователь не найден", "");
                } else {
                    app.dialog.alert("Логин или пароль неверный", "");

                }
            });
    }
}
