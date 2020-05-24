class HomeController < ApplicationController
  def show
    @notes = CouchPotato.database.view(Note.all)
  end
end
