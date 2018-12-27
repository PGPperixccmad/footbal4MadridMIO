//var table = $('#testliga').DataTable();
//Test function to show league via datatables
var table = $('#league_local').DataTable({
    "processing": true,
    "ajax": "sendleague_local",
    "iDisplayLength": 100,
    "order": [[ 8, 'desc' ],[7, 'desc' ] ], //sort by points, then GD
    "aoColumnDefs": [
        { "sClass": "photo-column", "aTargets": [ 0 ] },
        { "sClass": "user-column", "aTargets": [ 1 ] },
        { "sClass": "company-column", "aTargets": [ 2 ] }
    ],    
    "bLengthChange": false,
    "columns": [
        { data: 'photo' },
        { data: 'name' },
        { data: 'company' },
        { data: 'games' },
        { data: 'wins' },
        { data: 'loses' },
        { data: 'goalsAndAgainstgoals' },
        { data: 'goaldif' },
        { data: 'points' }

    ]
});    

setInterval( function () {
    table.ajax.reload();
    console.log("that reload_raw");
}, 30000 );


$('#league_local tbody').on( 'click', 'tr', function () {
    console.log( table.row( this ).data() );
} );

//add active class to highlight current site
$('a[href="' + this.location.pathname + '"]').addClass('active-green');

//add active class to highlight current site
$('a[href="/league"]').addClass('green');
$('a[href="/liveticker"]').addClass('green');
$('a[href="/league_local"]').addClass('green');

$.fn.dataTable.ext.errMode = 'throw';