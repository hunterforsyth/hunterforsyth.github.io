/* CSC309 - Assignment 2         */
/* By: Hunter Forsyth (c3forsyt) */

$(document).ready(function(){

    $('.main-game').hide();
    $('.game-over').hide();
    $('.game-finished').hide();
    updateHighscoreText();

    /* Start the game when the button is clicked. */
    $('#start-game-button').click( function (){
        $('.title-screen').hide();
        $('.main-game').show();
        initGame();
    });

    /* Return to titlescreen when game over 'ok' button clicked. */
    $('#game-over-button').click( function (){
        $('.game-over').hide();
        $('.title-screen').show();
        updateHighscoreText();
    });

    /* Restart game when restart button clicked. */
    $('#restart-button').click( function (){
        $('.game-finished').hide();
        $('.title-screen').show();
        updateHighscoreText();
    });

    /* Exit game when exit button clicked. */
    $('#exit-button').click( function (){
        window.close(); 
    });

    /* Update the highscore when the picker is changed. */
    $('#highscore-picker').on('change', function(){
        updateHighscoreText();
    })

    /* Update the text on the picker for both highscores. */
    function updateHighscoreText(){
        if ($('#highscore-picker').val() == "level-1"){
            $('#highscore').text(function(){
                return getHighscore("highscore1");
            });
        } else if ($('#highscore-picker').val() == "level-2"){
            $('#highscore').text(function(){
                return getHighscore("highscore2");
            });
        }
    }

    /* Return the highscore from local storage with tag. */
    function getHighscore(tag){
        var highscore = localStorage.getItem(tag);
        if (highscore == null){
            highscore = 0;
        }
        return highscore;
    }

});