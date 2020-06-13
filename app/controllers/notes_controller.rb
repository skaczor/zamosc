class NotesController < ApplicationController
  before_action :load_note, only: [:show, :edit, :update, :destroy]

  # GET /notes
  # GET /notes.json
  def index
    @notes = CouchPotato.database.view Note.all(descending: true)
  end

  def search
    view, keyword = if params[:title]
                      [:by_title, params[:title]]
                    elsif params[:description]
                      [:by_description, params[:description]]
                    elsif params[:contents]
                      [:by_content, params[:content]]
                    end
    @notes = Note.search(view, keyword) if view
  end
  

  # GET /notes/1
  # GET /notes/1.json
  def show
  end

  # GET /notes/new
  def new
    @note = Note.new
  end

  # GET /notes/1/edit
  def edit
  end

  # POST /notes
  # POST /notes.json
  def create
    @note = Note.new(note_params)

    respond_to do |format|
      if CouchPotato.database.save_document @note
        format.html { redirect_to @note, notice: 'Note was successfully created.' }
        format.json { render :show, status: :created, location: @note }
      else
        format.html { render :new }
        format.json { render json: @note.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /notes/1
  # PATCH/PUT /notes/1.json
  def update
    respond_to do |format|
      @note.attributes = note_params
      if CouchPotato.database.save_document @note
        format.html { redirect_to @note, notice: 'Note was successfully updated.' }
        format.json { render :show, status: :ok, location: @note }
      else
        format.html { render :edit }
        format.json { render json: @note.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /notes/1
  # DELETE /notes/1.json
  def destroy
    CouchPotato.database.destroy_document @note
    respond_to do |format|
      format.html { redirect_to notes_url, notice: 'Note was successfully destroyed.' }
      format.json { head :no_content }
    end
  end

  private

  # Use callbacks to share common setup or constraints between actions.
  def load_note
    @note = CouchPotato.database.load_document params[:id]
  end

  # Only allow a list of trusted parameters through.
  def note_params
    params.require(:note).permit(:title, :description, :description_rt, :content)
  end
end
