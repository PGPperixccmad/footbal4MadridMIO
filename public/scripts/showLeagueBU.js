//var table = $('#testliga').DataTable();
//Test function to show league via datatables
var tableBU = $('#BULiga').DataTable({
    "processing": true,
    "ajax": "sendleagueBU",
    "iDisplayLength": 100,
    "order": [[ 6, 'desc' ], [ 5, 'desc' ]],
    "aoColumnDefs": [
        { "sClass": "bu-column", "aTargets": [ 0 ] },
    ], 
    "bLengthChange": false, //do now show items per page filter
    "bFilter" : false, //do not show search filter
    "columns": [
        { data: 'BU' },
        { data: 'games' },
        { data: 'wins' },
        { data: 'loses' },
        { data: 'goalsAndAgainstgoals' },
        { data: 'goaldif' },
        { data: 'points' }

    ]
});    

setInterval( function () {
    tableBU.ajax.reload();
    console.log("that reload_raw");
}, 30000 );


$('#BULiga tbody').on( 'click', 'tr', function () {
    console.log( tableBU.row( this ).data() );
} );