let accidentList = document.querySelector("#accidentList"),
    eventList = document.querySelector("#eventList"),
    accidentBtn = document.querySelector("#accidentBtn"),
    eventBtn = document.querySelector("#eventBtn");

accidentBtn.addEventListener("click", function () {
    if (accidentList.classList.contains("log_main_panel_list_hide")) {
        accidentList.classList.toggle("log_main_panel_list_hide");
        eventList.classList.toggle("log_main_panel_list_hide");

        accidentBtn.classList.toggle("log_main_top_btn_active");
        eventBtn.classList.toggle("log_main_top_btn_active");
        console.log(1);
    } else {
        console.log(2);
    }
});
eventBtn.addEventListener("click", function () {
    if (eventList.classList.contains("log_main_panel_list_hide")) {
        accidentList.classList.toggle("log_main_panel_list_hide");
        eventList.classList.toggle("log_main_panel_list_hide");

        eventBtn.classList.toggle("log_main_top_btn_active");
        accidentBtn.classList.toggle("log_main_top_btn_active");
        console.log(3);
    } else {
        console.log(4);
    }
});
