var wayf_URL = "https://ds.gakunin.nii.ac.jp/WAYF";
var wayf_sp_entityID = "https://accounts.rdm.nii.ac.jp/shibboleth-sp";
var wayf_sp_handlerURL = "https://accounts.rdm.nii.ac.jp/Shibboleth.sso";
var wayf_return_url = "https://accounts.rdm.nii.ac.jp/login?service=https://rdm.nii.ac.jp/";
var wayf_width = 430;
var wayf_height = "auto";
var wayf_show_remember_checkbox = false;
var wayf_force_remember_for_session = false;
var wayf_use_small_logo = true;
var wayf_hide_logo = true;
var wayf_show_categories = false;
var wayf_overwrite_intro_text = "";
var wayf_font_size = 11;
var wayf_font_color = '#000000';
var wayf_border_color = '#00247D';
var wayf_background_color = '#F4F7F7';
var wayf_auto_login = true;
var wayf_hide_after_login = false;
var wayf_hide_categories =  new Array("all");
var wayf_unhide_idps = new Array(
     "https://openidp.nii.ac.jp/idp/shibboleth",
     "https://idp.rdm.nii.ac.jp/idp/shibboleth",
     "https://idp.nii.ac.jp/idp/shibboleth",
     "https://shib.nagoya-u.ac.jp/idp/shibboleth",
     "https://authidp1.iimc.kyoto-u.ac.jp/idp/shibboleth"
);
var wayf_additional_idps = [
     {name: "OpenIdP",
     entityID: "https://openidp.nii.ac.jp/idp/shibboleth",
     SAML1SSOurl: "https://openidp.nii.ac.jp/idp/profile/Shibboleth/SSO"},
     {name: "GakuNin RDM IdP",
     entityID: "https://idp.rdm.nii.ac.jp/idp/shibboleth",
     SAML1SSOurl: "https://idp.rdm.nii.ac.jp/idp/profile/Shibboleth/SSO"}
];
var wayf_sp_cookie_path = "/";
var wayf_list_height = 350;

var additionalHtml = "<style>" +
"div#wayfInMenu { float: left !important;} " +
"div#wayf_div { padding: 5px !important; width: auto !important; max-width: 430px !important;} " +
".wayf_col .wayf_col { flex-direction: row !important; padding-left: 0px !important; padding-right: 0px !important;} " +
"div.wayf_radioArea { display: none !important;} " +
"div.wayf_row { padding-left: 5px !important; padding-right: 5px !important;} " +
"div.wayf_linkArea { align-content: center !important;}" +
"form#IdPList table tbody { display: flex !important; flex-direction: row !important;} " +
"form#IdPList table tbody tr td div#clear_a { text-decoration: none; margin-top: 10px; margin-left: 5px; margin-right: 3px;} " +
"@media only screen and (max-width: 768px) { #wayf_div .wayf_inputArea {  flex-wrap: nowrap !important;} #wayf_submit_div { width: auto !important; }} " +
"@media only screen and (max-width: 767px) { #wayf_div .wayf_inputArea {  flex-wrap: wrap !important; } #wayf_submit_div {  width: 100% !important; }} " +
"</style>";
