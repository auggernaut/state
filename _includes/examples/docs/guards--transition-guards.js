function Scholar () {}
state( Scholar.prototype, 'abstract', {
    Matriculated: state( 'initial', {
        graduate: function ( gpa ) {
            this.owner().gpa = gpa;
            this.change( 'Graduated' );
        }
    }),
    Graduated: state( 'final' ),

    transitions: {
        Summa: {
            origin: 'Matriculated', target: 'Graduated',
            admit: function () { return this.data().gpa >= 3.9; },
            action: function () { /* swat down offers */ }
        },
        Magna: {
            origin: 'Matriculated', target: 'Graduated',
            admit: function () {
                var gpa = this.data().gpa;
                return 3.75 <= gpa && gpa < 3.9;
            },
            action: function () { /* swat down recruiters */ }
        },
        Laude: {
            origin: 'Matriculated', target: 'Graduated',
            admit: function () {
                var gpa = this.data().gpa;
                return 3.50 <= gpa && gpa < 3.75;
            },
            action: function () { /* brag to the cat */ }
        },
        '': {
            origin: 'Matriculated', target: 'Graduated',
            action: function () { /* blame rounding error */ }
        }
    }
});

var scholar = new Scholar;
scholar.graduate( 3.4999 );